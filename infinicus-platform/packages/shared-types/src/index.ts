// Shared types — populated as layers are integrated
export type LayerId =
  | 'DAL' | 'BO' | 'BI' | 'DT'
  | 'SIM' | 'ADI' | 'ABA' | 'OM' | 'CL';

export interface HandoffEnvelope<T = unknown> {
  handoffId:     string;
  sourceLayer:   LayerId;
  targetLayer:   LayerId;
  correlationId: string;
  payload:       T;
  timestamp:     string;
  status:        'ready' | 'blocked' | 'error';
}

export interface LayerResult<T = unknown> {
  ok:      boolean;
  data?:   T;
  error?:  string;
  code?:   string;
}
