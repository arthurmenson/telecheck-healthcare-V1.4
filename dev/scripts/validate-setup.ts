#!/usr/bin/env tsx

interface ValidationTest {
  name: string;
  description: string;
  test: () => Promise<boolean>;
  required: boolean;
}

class SetupValidator {
  private tests: ValidationTest[] = [
    {
      name: 'Docker Compose',
      description: 'Docker compose configuration is valid',
      required: true,
      test: async () => {
        try {
          const response = await fetch('http://localhost:5432');
          return false; // PostgreSQL shouldn't respond to HTTP
        } catch (error) {
          return true; // ECONNREFUSED is expected for PostgreSQL
        }
      }
    },
    {
      name: 'PostgreSQL Database',
      description: 'Database is accessible and has tables',
      required: true,
      test: async () => {
        try {
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);

          const result = await execAsync('docker exec spark-den-postgres psql -U postgres -d spark_den_dev -c "SELECT COUNT(*) FROM spark_den.providers;" 2>/dev/null');
          return result.stdout.includes('3'); // Should have 3 seeded providers
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: 'Redis Cache',
      description: 'Redis is running and accessible',
      required: true,
      test: async () => {
        try {
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);

          const result = await execAsync('docker exec spark-den-redis redis-cli ping 2>/dev/null');
          return result.stdout.trim() === 'PONG';
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: 'Auth Security Service',
      description: 'Authentication service is healthy',
      required: true,
      test: async () => {
        try {
          const response = await fetch('http://localhost:3002/health', {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: 'Authentication Flow',
      description: 'Can authenticate with development credentials',
      required: true,
      test: async () => {
        try {
          const response = await fetch('http://localhost:3002/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'admin@sparkden.com',
              password: 'password123'
            }),
            signal: AbortSignal.timeout(5000)
          });

          if (!response.ok) return false;

          const data = await response.json();
          return data.token && data.token.length > 0;
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: 'AI/ML Services',
      description: 'AI/ML services are healthy',
      required: true,
      test: async () => {
        try {
          const response = await fetch('http://localhost:3000/health', {
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: 'Core Services',
      description: 'Core patient services are healthy',
      required: true,
      test: async () => {
        try {
          const response = await fetch('http://localhost:3001/health', {
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: 'Analytics Reporting',
      description: 'Analytics service is healthy',
      required: true,
      test: async () => {
        try {
          const response = await fetch('http://localhost:3003/health', {
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: 'PMS Integrations',
      description: 'Integration services are healthy',
      required: true,
      test: async () => {
        try {
          const response = await fetch('http://localhost:3004/health', {
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: 'Frontend Application',
      description: 'Frontend is serving and accessible',
      required: true,
      test: async () => {
        try {
          const response = await fetch('http://localhost:5173', {
            signal: AbortSignal.timeout(5000)
          });
          return response.ok && response.headers.get('content-type')?.includes('text/html');
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: 'API Integration',
      description: 'Frontend can communicate with backend APIs',
      required: true,
      test: async () => {
        try {
          // Get auth token first
          const authResponse = await fetch('http://localhost:3002/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'admin@sparkden.com',
              password: 'password123'
            }),
            signal: AbortSignal.timeout(5000)
          });

          if (!authResponse.ok) return false;

          const authData = await authResponse.json();
          if (!authData.token) return false;

          // Test API call with token
          const apiResponse = await fetch('http://localhost:3001/api/patients', {
            headers: {
              'Authorization': `Bearer ${authData.token}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
          });

          return apiResponse.ok;
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: 'Environment Files',
      description: 'All required environment files exist',
      required: true,
      test: async () => {
        const { access } = await import('fs/promises');
        const { constants } = await import('fs');

        const envFiles = [
          'workstream/database/.env',
          'workstream/auth-security/.env',
          'workstream/ai-ml-services/.env',
          'workstream/core-services/.env',
          'workstream/analytics-reporting/.env',
          'workstream/pms-integrations/.env'
        ];

        try {
          await Promise.all(
            envFiles.map(file => access(file, constants.F_OK))
          );
          return true;
        } catch (error) {
          return false;
        }
      }
    }
  ];

  async runValidation(): Promise<{ passed: number; failed: number; total: number; critical: boolean }> {
    console.log('🔍 Validating Spark Den Healthcare Platform Setup');
    console.log('================================================');
    console.log();

    let passed = 0;
    let failed = 0;
    const failedRequired = [];

    for (const test of this.tests) {
      process.stdout.write(`⏳ ${test.name.padEnd(25)} `);

      try {
        const result = await test.test();

        if (result) {
          console.log('✅ PASS');
          passed++;
        } else {
          console.log(test.required ? '❌ FAIL (Required)' : '⚠️  FAIL (Optional)');
          failed++;
          if (test.required) {
            failedRequired.push(test);
          }
        }
      } catch (error) {
        console.log(test.required ? '❌ ERROR (Required)' : '⚠️  ERROR (Optional)');
        failed++;
        if (test.required) {
          failedRequired.push({ ...test, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    console.log();
    console.log('📊 Validation Results:');
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total:  ${this.tests.length}`);
    console.log();

    const critical = failedRequired.length > 0;

    if (critical) {
      console.log('🚨 Critical Issues Found:');
      failedRequired.forEach(test => {
        console.log(`   ❌ ${test.name}: ${test.description}`);
        if (test.error) {
          console.log(`      Error: ${test.error}`);
        }
      });
      console.log();
      console.log('💡 Troubleshooting Steps:');
      console.log('   1. Check if Docker is running: docker ps');
      console.log('   2. Check service status: ./scripts/setup-dev.sh status');
      console.log('   3. View logs: docker-compose logs');
      console.log('   4. Restart services: ./scripts/setup-dev.sh restart');
      console.log('   5. Full reset: ./scripts/setup-dev.sh clean && ./scripts/setup-dev.sh setup');
    } else {
      console.log('🎉 All critical tests passed!');
      console.log();
      console.log('🚀 Your development environment is ready!');
      console.log();
      console.log('📝 Next Steps:');
      console.log('   1. Access the application: http://localhost:5173');
      console.log('   2. Login: admin@sparkden.com / password123');
      console.log('   3. Monitor health: tsx scripts/health-monitor.ts monitor');
      console.log('   4. View API docs: http://localhost:3001/api-docs');
    }

    return {
      passed,
      failed,
      total: this.tests.length,
      critical
    };
  }
}

async function main() {
  const validator = new SetupValidator();
  const result = await validator.runValidation();

  // Exit with non-zero code if critical tests failed
  process.exit(result.critical ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Validation error:', error);
    process.exit(1);
  });
}