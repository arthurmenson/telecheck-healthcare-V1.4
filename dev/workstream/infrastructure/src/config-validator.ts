export type Environment = 'development' | 'staging' | 'production';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface Configuration {
  readonly environment: Environment;
  readonly logLevel: LogLevel;
  readonly port: number;
}

const VALID_ENVIRONMENTS: readonly Environment[] = ['development', 'staging', 'production'];
const VALID_LOG_LEVELS: readonly LogLevel[] = ['error', 'warn', 'info', 'debug'];
const MIN_PORT = 1;
const MAX_PORT = 65535;
const DEFAULT_LOG_LEVEL: LogLevel = 'info';
const DEFAULT_PORT = 3000;

export const validateConfiguration = (config: Configuration | undefined): Configuration => {
  if (config === undefined) {
    throw new Error('Configuration cannot be undefined');
  }

  if (!config.environment) {
    throw new Error('Required field "environment" is missing');
  }

  if (!VALID_ENVIRONMENTS.includes(config.environment)) {
    throw new Error('Environment must be one of: development, staging, production');
  }

  const port = config.port ?? DEFAULT_PORT;
  if (port < MIN_PORT || port > MAX_PORT) {
    throw new Error('Port must be between 1 and 65535');
  }

  const logLevel = config.logLevel ?? DEFAULT_LOG_LEVEL;
  if (!VALID_LOG_LEVELS.includes(logLevel)) {
    throw new Error(`Log level must be one of: ${VALID_LOG_LEVELS.join(', ')}`);
  }

  return {
    environment: config.environment,
    logLevel,
    port
  };
};