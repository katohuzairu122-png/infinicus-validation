// Mock HandoffEnvelope factory for unit tests
import type { HandoffEnvelope, LayerId } from '@infinicus/shared-types';

export function mockHandoff<T>(
  source: LayerId,
  target: LayerId,
  payload: T
): HandoffEnvelope<T> {
  return {
    handoffId:     `test-handoff-${Date.now()}`,
    sourceLayer:   source,
    sourceBlock:   'test',
    targetLayer:   target,
    targetBlock:   'test',
    correlationId: `test-correlation-${Date.now()}`,
    payload,
    lineage:       [],
    createdAt:     new Date().toISOString(),
    status:        'ready',
  };
}
