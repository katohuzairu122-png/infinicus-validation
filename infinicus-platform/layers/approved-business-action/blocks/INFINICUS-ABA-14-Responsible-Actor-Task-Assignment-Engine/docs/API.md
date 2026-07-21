# API

`window.INFINICUS.ABA.responsibleActorTaskAssignmentEngine`

- `registerActor(input)`
- `registerTeam(input)`
- `registerAvailability(input)`
- `registerSeparationRule(input)`
- `assignTasks({ taskAssignmentHandoffId, assignments, assignedBy })`
- `respond({ taskAssignmentId, response, reason })`
- `prepareReservationHandoff({ executionPlanId })`
- `getTaskAssignment({ taskAssignmentId })`
- `getResourceReservationHandoff({ resourceReservationHandoffId })`
- `listPlanAssignments({ executionPlanId })`

Routes:
- `aba.actor.register`
- `aba.team.register`
- `aba.actor_availability.register`
- `aba.separation_rule.register`
- `aba.tasks.assign`
- `aba.task_assignment.respond`
- `aba.task_assignments.prepare_reservation`
