import { validateConfiguration, type Configuration } from './config-validator';

const main = (): void => {
  const config: Configuration = {
    environment: 'development',
    logLevel: 'info',
    port: 3000
  };

  try {
    const validatedConfig = validateConfiguration(config);
    console.log('Infrastructure workstream initialized with config:', validatedConfig);
  } catch (error) {
    console.error('Configuration validation failed:', error);
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };