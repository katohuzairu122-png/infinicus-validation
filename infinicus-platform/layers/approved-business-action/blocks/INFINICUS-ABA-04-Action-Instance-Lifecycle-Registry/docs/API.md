# API

`window.INFINICUS.ABA.actionInstanceLifecycleRegistry`

- `createInstance({ actionInstanceHandoffId, createdBy, expiresAt })`
- `transition({ actionInstanceId, toState, actorId, actorType, reason, metadata, expectedVersion })`
- `getActionInstance({ actionInstanceId })`
- `getAuthorityHandoff({ authorityHandoffId })`
- `listActionTransitions({ actionInstanceId })`
- `listActionInstances()`

## Routes

- `aba.action_instance.create`
- `aba.action_instance.transition`
