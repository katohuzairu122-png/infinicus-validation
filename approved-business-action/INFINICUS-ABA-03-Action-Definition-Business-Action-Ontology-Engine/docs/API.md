# API

`window.INFINICUS.ABA.actionDefinitionOntologyEngine`

- `registerCategory(input)`
- `registerTargetType(input)`
- `registerParameterSchema(input)`
- `registerActionType(input)`
- `defineAction({ actionDefinitionHandoffId, actionTypeId, target, parameters })`
- `getActionDefinition({ actionDefinitionId })`
- `getActionInstanceHandoff({ actionInstanceHandoffId })`
- `listActionTypes()`
- `listQuarantinedDefinitions()`

## Routes

- `aba.action_category.register`
- `aba.target_type.register`
- `aba.parameter_schema.register`
- `aba.action_type.register`
- `aba.action_definition.create`
