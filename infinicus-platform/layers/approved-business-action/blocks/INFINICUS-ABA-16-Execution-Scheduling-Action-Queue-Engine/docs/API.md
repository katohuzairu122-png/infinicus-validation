# API

`window.INFINICUS.ABA.executionSchedulingQueueEngine`

- `registerPolicy(input)`
- `createSchedule({ executionScheduleHandoffId, executionSchedulePolicyId, tasks, approvedWindow })`
- `updateScheduleState({ executionScheduleId, state, reason })`
- `leaseNext({ workerId, now })`
- `getExecutionSchedule({ executionScheduleId })`
- `getExecutionAdapterHandoff({ executionAdapterHandoffId })`
- `listQueueItems({ executionScheduleId })`

Routes:
- `aba.execution_schedule_policy.register`
- `aba.execution_schedule.create`
- `aba.execution_schedule.state`
- `aba.execution_queue.lease_next`
