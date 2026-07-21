// SIM — Simulation Layer — Monte Carlo 90-day projection engine
export const LAYER_ID = 'SIM';

// BUILD-07 — typed public integration boundary around Engine v3.
export {
  SimulationIntegrationError,
  SimulationEngineUnavailableError,
  SimulationOperationUnavailableError,
  SimulationRequestInvalidError,
  SimulationRunNotFoundError,
  SimulationRunNotCompletedError,
  SimulationTenantBoundaryError,
  SimulationResultInvalidError,
} from './contracts/errors';
export type { SimulationIntegrationErrorCode } from './contracts/errors';

export { validateScenarioRequest } from './contracts/ports';
export type {
  EngineV3Parameters,
  SimulationScenarioRequest,
  CompletedSimulationRun,
  SimulationExecutionResult,
  CompletedRunQuery,
  ExecuteSimulationScenarioPort,
  ReadCompletedSimulationRunPort,
} from './contracts/ports';

export { createEngineV3BrowserAdapter, ENGINE_V3_NAMESPACE } from './infrastructure/engine-v3-browser-adapter';
export type {
  EngineV3SimulationGlobal,
  EngineV3FacadeResult,
  EngineV3FacadeError,
  EngineV3AdapterOptions,
} from './infrastructure/engine-v3-browser-adapter';

export { mapCompletedRunToSIMToADIHandoff } from './application/sim-to-adi-mapper';
export type { SimToADIMapperOptions } from './application/sim-to-adi-mapper';
