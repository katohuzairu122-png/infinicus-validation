// Layer test harness — boots a layer in isolation for unit/integration tests
export interface LayerHarness {
  start(): Promise<void>;
  stop(): Promise<void>;
  emit(event: string, payload: unknown): Promise<void>;
}

export function createLayerHarness(_layerId: string): LayerHarness {
  return {
    async start()  { /* boot layer */ },
    async stop()   { /* teardown  */ },
    async emit()   { /* emit event */ }
  };
}
