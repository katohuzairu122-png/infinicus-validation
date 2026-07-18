(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.outcomeAuditPolicyModel.create(
        input
      );

    if(!built.ok) return built;

    return global.INFINICUS.OM.outcomeAuditStore.put(
      "policies",
      built.data
    );
  }

  async function assemble({
    outcomeAuditHandoffId,
    outcomeAuditPolicyId,
    supplementalEvidence={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.monitoringExceptionMissingDataEngine
        .getOutcomeAuditHandoff({
          outcomeAuditHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.outcomeAuditStore.get(
        "policies",
        outcomeAuditPolicyId
      );

    if(!policy.ok) return policy;

    const auditPackage={
      outcomeAuditPackageId:
        runtime.createId("om_outcome_audit_package"),
      monitoringContractId:
        handoff.data.monitoringContractId,
      actionInstanceId:
        supplementalEvidence.actionInstanceId || null,
      actionCompletionCertificateId:
        supplementalEvidence.actionCompletionCertificateId || null,
      observations:
        runtime.clone(supplementalEvidence.observations || []),
      validationRecords:
        runtime.clone(supplementalEvidence.validationRecords || []),
      progressRecords:
        runtime.clone(supplementalEvidence.progressRecords || []),
      varianceRecords:
        runtime.clone(supplementalEvidence.varianceRecords || []),
      alertRecords:
        runtime.clone(supplementalEvidence.alertRecords || []),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      confounders:
        handoff.data.confounders.map(runtime.clone),
      comparisons:
        handoff.data.comparisons.map(runtime.clone),
      confidenceRatings:
        handoff.data.confidenceRatings.map(runtime.clone),
      reliabilityRatings:
        handoff.data.reliabilityRatings.map(runtime.clone),
      benefitAssessments:
        handoff.data.benefitAssessments.map(runtime.clone),
      adverseOutcomes:
        handoff.data.adverseOutcomes.map(runtime.clone),
      monitoringExceptions:
        handoff.data.monitoringExceptions.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      generatedAt:new Date().toISOString()
    };

    const validation=
      global.INFINICUS.OM.outcomeAuditValidator.validate({
        auditPackage,
        policy:policy.data
      });

    if(!validation.valid){
      return runtime.failure(
        "OM_AUDIT_PACKAGE_INVALID",
        "Outcome audit package failed validation.",
        validation
      );
    }

    const packageHash=
      await global.INFINICUS.OM.auditCanonicalizer.sha256(
        auditPackage
      );

    const storedPackage={
      ...auditPackage,
      auditCompleteness:
        validation.completeness,
      hashAlgorithm:
        policy.data.hashAlgorithm,
      packageHash,
      tamperEvidence:{
        canonicalization:"sorted-key-json",
        immutableLedger:false,
        generatedAt:new Date().toISOString()
      },
      state:"sealed"
    };

    await global.INFINICUS.OM.outcomeAuditStore.put(
      "packages",
      storedPackage
    );

    const auditEvent={
      outcomeAuditEventId:
        runtime.createId("om_audit_event"),
      outcomeAuditPackageId:
        storedPackage.outcomeAuditPackageId,
      eventType:"package_sealed",
      packageHash,
      occurredAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeAuditStore.put(
      "events",
      auditEvent
    );

    const verdictHandoff={
      outcomeVerdictHandoffId:
        runtime.createId("om_outcome_verdict_handoff"),
      targetBlock:"OM-22",
      monitoringContractId:
        handoff.data.monitoringContractId,
      outcomeAuditPackageId:
        storedPackage.outcomeAuditPackageId,
      packageHash,
      auditCompleteness:
        storedPackage.auditCompleteness,
      comparisons:
        storedPackage.comparisons.map(runtime.clone),
      confidenceRatings:
        storedPackage.confidenceRatings.map(runtime.clone),
      reliabilityRatings:
        storedPackage.reliabilityRatings.map(runtime.clone),
      benefitAssessments:
        storedPackage.benefitAssessments.map(runtime.clone),
      adverseOutcomes:
        storedPackage.adverseOutcomes.map(runtime.clone),
      monitoringExceptions:
        storedPackage.monitoringExceptions.map(runtime.clone),
      causationAssessments:
        storedPackage.causationAssessments.map(runtime.clone),
      attributionAssessments:
        storedPackage.attributionAssessments.map(runtime.clone),
      correlationId:
        storedPackage.correlationId,
      lineage:
        storedPackage.lineage.map(runtime.clone),
      confidence:
        storedPackage.confidence,
      reliability:
        storedPackage.reliability,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeAuditStore.put(
      "verdict_handoffs",
      verdictHandoff
    );

    await runtime.emit(
      "om.outcome_audit.sealed",
      {
        outcomeAuditPackageId:
          storedPackage.outcomeAuditPackageId,
        packageHash,
        outcomeVerdictHandoffId:
          verdictHandoff.outcomeVerdictHandoffId
      }
    );

    return runtime.success({
      auditPackage:storedPackage,
      auditEvent,
      outcomeVerdictHandoff:verdictHandoff
    });
  }

  async function verify({
    outcomeAuditPackageId
  }={}){
    const record=
      await global.INFINICUS.OM.outcomeAuditStore.get(
        "packages",
        outcomeAuditPackageId
      );

    if(!record.ok) return record;

    const {
      packageHash,
      auditCompleteness,
      hashAlgorithm,
      tamperEvidence,
      state,
      ...hashable
    }=record.data;

    const calculatedHash=
      await global.INFINICUS.OM.auditCanonicalizer.sha256(
        hashable
      );

    return runtime.success({
      outcomeAuditPackageId,
      valid:calculatedHash===packageHash,
      storedHash:packageHash,
      calculatedHash
    });
  }

  async function exportPackage({
    outcomeAuditPackageId,
    format="json"
  }={}){
    const record=
      await global.INFINICUS.OM.outcomeAuditStore.get(
        "packages",
        outcomeAuditPackageId
      );

    if(!record.ok) return record;

    if(format!=="json"){
      return runtime.failure(
        "OM_AUDIT_EXPORT_FORMAT_UNSUPPORTED",
        "Only JSON export is supported in this package."
      );
    }

    const exportRecord={
      outcomeAuditExportId:
        runtime.createId("om_audit_export"),
      outcomeAuditPackageId,
      format,
      payload:JSON.stringify(record.data,null,2),
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeAuditStore.put(
      "exports",
      exportRecord
    );

    return runtime.success(exportRecord);
  }

  const api=Object.freeze({
    registerPolicy,
    assemble,
    verify,
    exportPackage,
    getAuditPackage:({outcomeAuditPackageId}) =>
      global.INFINICUS.OM.outcomeAuditStore.get(
        "packages",
        outcomeAuditPackageId
      ),
    getOutcomeVerdictHandoff:({
      outcomeVerdictHandoffId
    }) =>
      global.INFINICUS.OM.outcomeAuditStore.get(
        "verdict_handoffs",
        outcomeVerdictHandoffId
      ),
    listAuditEvents:() =>
      global.INFINICUS.OM.outcomeAuditStore.list(
        "events"
      )
  });

  runtime.registerService(
    "om.outcome_evidence_audit_trail",
    api,
    {block:"OM-21"}
  );

  runtime.registerRoute(
    "om.outcome_audit_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.outcome_audit.assemble",
    assemble
  );

  runtime.registerRoute(
    "om.outcome_audit.verify",
    verify
  );

  runtime.registerRoute(
    "om.outcome_audit.export",
    exportPackage
  );

  global.INFINICUS.OM.outcomeEvidenceAuditTrailEngine=api;
})(window);
