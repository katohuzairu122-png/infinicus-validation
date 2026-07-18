// Configuration loader
export interface InfinicusConfig {
  env:        'development' | 'staging' | 'production';
  supabaseUrl: string;
  supabaseKey: string;
  sentryDsn?:  string;
}

export function loadConfig(): InfinicusConfig {
  throw new Error('loadConfig() not yet implemented — replace with env adapter');
}
