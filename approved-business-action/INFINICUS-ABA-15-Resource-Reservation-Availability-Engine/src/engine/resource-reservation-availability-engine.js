(function(global){
  "use strict";
  const runtime=global.INFINICUS.ABA.runtime;

  async function registerResource(input={}){
    const built=global.INFINICUS.ABA.resourceModel.create(input);
    if(!built.ok) return built;
    return global.INFINICUS.ABA.resourceReservationStore.put(
      "resources",built.data
    );
  }

  async function reserve({
    resourceReservationHandoffId,
    requests=[]
  }={}){
    const handoff=
      await global.INFINICUS.ABA.responsibleActorTaskAssignmentEngine
        .getResourceReservationHandoff({resourceReservationHandoffId});

    if(!handoff.ok) return handoff;

    const created=[];

    for(const request of requests){
      const resource=
        await global.INFINICUS.ABA.resourceReservationStore.get(
          "resources",
          request.resourceId
        );
      if(!resource.ok) return resource;

      const existing=
        await global.INFINICUS.ABA.resourceReservationStore.listByIndex(
          "reservations",
          "resourceId",
          request.resourceId
        );
      if(!existing.ok) return existing;

      const validation=
        global.INFINICUS.ABA.resourceReservationValidator.validateRequest({
          resource:resource.data,
          request,
          existingReservations:existing.data
        });

      if(!validation.valid){
        const failure={
          reservationFailureId:runtime.createId("aba_reservation_failure"),
          resourceReservationHandoffId,
          executionPlanId:handoff.data.executionPlanId,
          resourceId:request.resourceId,
          request:runtime.clone(request),
          issues:validation.issues,
          createdAt:new Date().toISOString()
        };
        await global.INFINICUS.ABA.resourceReservationStore.put(
          "failures",
          failure
        );
        return runtime.failure(
          "ABA_RESOURCE_RESERVATION_FAILED",
          "Resource reservation failed.",
          failure
        );
      }

      const built=
        global.INFINICUS.ABA.resourceReservationModel.create({
          handoff:handoff.data,
          request,
          resource:resource.data
        });

      if(!built.ok) return built;

      await global.INFINICUS.ABA.resourceReservationStore.put(
        "reservations",
        built.data
      );

      created.push(built.data);
    }

    const scheduleHandoff={
      executionScheduleHandoffId:
        runtime.createId("aba_execution_schedule_handoff"),
      targetBlock:"ABA-16",
      executionPlanId:handoff.data.executionPlanId,
      assignments:handoff.data.assignments.map(runtime.clone),
      reservations:created.map(runtime.clone),
      correlationId:handoff.data.correlationId || null,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.resourceReservationStore.put(
      "schedule_handoffs",
      scheduleHandoff
    );

    await runtime.emit("aba.resources.reserved",{
      executionPlanId:handoff.data.executionPlanId,
      reservationCount:created.length,
      executionScheduleHandoffId:
        scheduleHandoff.executionScheduleHandoffId
    });

    return runtime.success({
      reservations:created,
      executionScheduleHandoff:scheduleHandoff
    });
  }

  async function release({
    resourceReservationId,
    releasedBy,
    reason
  }={}){
    const reservation=
      await global.INFINICUS.ABA.resourceReservationStore.get(
        "reservations",
        resourceReservationId
      );

    if(!reservation.ok) return reservation;

    if(reservation.data.state==="released"){
      return runtime.success({
        reservation:reservation.data,
        idempotentReplay:true
      });
    }

    const updated={
      ...runtime.clone(reservation.data),
      state:"released",
      releasedBy:String(releasedBy || "system"),
      releaseReason:String(reason || "Reservation released."),
      releasedAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.resourceReservationStore.put(
      "reservations",
      updated
    );

    await runtime.emit("aba.resource_reservation.released",updated);

    return runtime.success({reservation:updated});
  }

  async function expireReservations(){
    const all=
      await global.INFINICUS.ABA.resourceReservationStore.list("reservations");

    if(!all.ok) return all;

    const expired=[];

    for(const item of all.data){
      if(
        item.state==="reserved" &&
        item.expiresAt &&
        new Date(item.expiresAt).getTime()<=Date.now()
      ){
        const updated={
          ...runtime.clone(item),
          state:"expired",
          expiredAt:new Date().toISOString(),
          updatedAt:new Date().toISOString()
        };
        await global.INFINICUS.ABA.resourceReservationStore.put(
          "reservations",
          updated
        );
        expired.push(updated);
      }
    }

    return runtime.success({expired});
  }

  const api=Object.freeze({
    registerResource,
    reserve,
    release,
    expireReservations,
    getReservation:({resourceReservationId}) =>
      global.INFINICUS.ABA.resourceReservationStore.get(
        "reservations",
        resourceReservationId
      ),
    getExecutionScheduleHandoff:({executionScheduleHandoffId}) =>
      global.INFINICUS.ABA.resourceReservationStore.get(
        "schedule_handoffs",
        executionScheduleHandoffId
      ),
    listPlanReservations:({executionPlanId}) =>
      global.INFINICUS.ABA.resourceReservationStore.listByIndex(
        "reservations",
        "executionPlanId",
        executionPlanId
      )
  });

  runtime.registerService(
    "aba.resource_reservation_availability",
    api,
    {block:"ABA-15"}
  );

  runtime.registerRoute("aba.resource.register",registerResource);
  runtime.registerRoute("aba.resources.reserve",reserve);
  runtime.registerRoute("aba.resource_reservation.release",release);
  runtime.registerRoute("aba.resource_reservations.expire",expireReservations);

  runtime.registerBlock("ABA-15",{
    name:"Resource Reservation and Availability Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.resourceReservationAvailabilityEngine=api;
})(window);
