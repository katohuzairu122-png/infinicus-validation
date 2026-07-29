# API

`window.INFINICUS.OM.observationWindowScheduleEngine`

- `registerPolicy(input)`
- `createSchedules({ monitoringScheduleHandoffId, monitoringSchedulePolicyId })`
- `changeState({ monitoringScheduleId, nextState, reason })`
- `getSchedule({ monitoringScheduleId })`
- `getNormalizationHandoff({ normalizationHandoffId })`
- `listCheckpoints()`

Routes:
- `om.monitoring_schedule_policy.register`
- `om.monitoring_schedules.create`
- `om.monitoring_schedule.state_change`
