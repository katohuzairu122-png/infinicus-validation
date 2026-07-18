// Event contracts — define all cross-layer events here
import type { LayerId } from '@infinicus/shared-types';

export interface LayerEvent {
  type:        string;
  sourceLayer: LayerId;
  correlationId: string;
  timestamp:   string;
  payload:     unknown;
}
