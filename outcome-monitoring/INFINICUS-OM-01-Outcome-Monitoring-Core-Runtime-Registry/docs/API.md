# API

`window.INFINICUS.OM.runtime`

## Core

- `success(data, meta)`
- `failure(code, message, details, meta)`
- `createId(prefix)`
- `clone(value)`

## Services and routes

- `registerService(name, service, metadata)`
- `getService(name)`
- `listServices()`
- `registerRoute(name, handler, metadata)`
- `dispatch(name, payload)`
- `listRoutes()`

## Events

- `subscribe(eventName, handler)`
- `emit(eventName, payload)`
- `listEvents()`

## Monitoring registries

- `registerMetric(record)`
- `getMetric(metricId)`
- `listMetrics()`
- `registerObservationSource(record)`
- `getObservationSource(observationSourceId)`
- `listObservationSources()`
- `registerMonitoringContract(record)`
- `getMonitoringContract(monitoringContractId)`
- `listMonitoringContracts()`
- `registerOutcomeState(record)`
- `getOutcomeState(outcomeStateId)`
- `listOutcomeStates()`

## Diagnostics

- `getBlockManifest()`
- `diagnose()`

## Routes

- `om.runtime.diagnose`
- `om.runtime.manifest`
