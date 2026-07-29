# API

`window.INFINICUS.ABA.resourceReservationAvailabilityEngine`

- `registerResource(input)`
- `reserve({ resourceReservationHandoffId, requests })`
- `release({ resourceReservationId, releasedBy, reason })`
- `expireReservations()`
- `getReservation({ resourceReservationId })`
- `getExecutionScheduleHandoff({ executionScheduleHandoffId })`
- `listPlanReservations({ executionPlanId })`

Routes:
- `aba.resource.register`
- `aba.resources.reserve`
- `aba.resource_reservation.release`
- `aba.resource_reservations.expire`
