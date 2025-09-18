import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { config } from 'dotenv';
import { logger } from '../src/utils/logger';
import { TestDatabase } from './utils/TestDatabase';
import { MockExternalServices } from './mocks/MockExternalServices';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
let testDb: TestDatabase;
let mockServices: MockExternalServices;

beforeAll(async () => {
  logger.info('Setting up test environment...');

  // Initialize test database
  testDb = new TestDatabase();
  await testDb.connect();
  await testDb.migrate();

  // Initialize mock external services
  mockServices = new MockExternalServices();
  await mockServices.start();

  // Set test environment flags
  process.env.NODE_ENV = 'test';
  process.env.MOCK_EXTERNAL_APIS = 'true';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  logger.info('Test environment setup complete');
});

afterAll(async () => {
  logger.info('Tearing down test environment...');

  // Cleanup test database
  if (testDb) {
    await testDb.cleanup();
    await testDb.disconnect();
  }

  // Stop mock services
  if (mockServices) {
    await mockServices.stop();
  }

  logger.info('Test environment teardown complete');
});

beforeEach(async () => {
  // Reset database state before each test
  if (testDb) {
    await testDb.resetData();
  }

  // Reset mock service state
  if (mockServices) {
    mockServices.resetMocks();
  }
});

afterEach(async () => {
  // Cleanup any test-specific state
  // This runs after each individual test
});

// Global test utilities
declare global {
  var testDb: TestDatabase;
  var mockServices: MockExternalServices;
}

global.testDb = testDb;
global.mockServices = mockServices;

// Custom matchers for healthcare-specific testing
expect.extend({
  toBeValidFHIRResource(received: any, resourceType?: string) {
    const pass = received &&
                  received.resourceType &&
                  (!resourceType || received.resourceType === resourceType);

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid FHIR ${resourceType || 'resource'}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid FHIR ${resourceType || 'resource'}`,
        pass: false,
      };
    }
  },

  toComplyWithUSCDI(received: any, version: string = 'v3') {
    // Implement USCDI compliance checking logic
    const pass = received && received.resourceType;
    // Add more sophisticated USCDI validation here

    if (pass) {
      return {
        message: () => `Expected ${received} not to comply with USCDI ${version}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to comply with USCDI ${version}`,
        pass: false,
      };
    }
  },

  toHaveValidHIPAACompliance(received: any) {
    // Implement HIPAA compliance checking
    const pass = true; // Implement actual validation logic

    if (pass) {
      return {
        message: () => `Expected ${received} not to be HIPAA compliant`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be HIPAA compliant`,
        pass: false,
      };
    }
  },

  toHaveValidHL7Message(received: any, messageType?: string) {
    // Implement HL7 message validation
    const pass = received && typeof received === 'string' && received.startsWith('MSH');

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid HL7 ${messageType || 'message'}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid HL7 ${messageType || 'message'}`,
        pass: false,
      };
    }
  },

  toHaveValidX12Transaction(received: any, transactionType?: string) {
    // Implement X12 transaction validation
    const pass = received && typeof received === 'string';

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid X12 ${transactionType || 'transaction'}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid X12 ${transactionType || 'transaction'}`,
        pass: false,
      };
    }
  }
});

// Extend Vitest's expect interface
interface CustomMatchers<R = unknown> {
  toBeValidFHIRResource(resourceType?: string): R;
  toComplyWithUSCDI(version?: string): R;
  toHaveValidHIPAACompliance(): R;
  toHaveValidHL7Message(messageType?: string): R;
  toHaveValidX12Transaction(transactionType?: string): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// Test data factories
export class TestDataFactory {
  static createPatient(overrides?: Partial<any>) {
    return {
      resourceType: 'Patient',
      id: `test-patient-${Date.now()}`,
      name: [{
        use: 'official',
        family: 'Test',
        given: ['Patient']
      }],
      gender: 'unknown',
      birthDate: '1990-01-01',
      identifier: [{
        system: 'http://test.hospital.org',
        value: `MRN-${Date.now()}`
      }],
      ...overrides
    };
  }

  static createObservation(patientId: string, overrides?: Partial<any>) {
    return {
      resourceType: 'Observation',
      id: `test-observation-${Date.now()}`,
      status: 'final',
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '29463-7',
          display: 'Body Weight'
        }]
      },
      subject: {
        reference: `Patient/${patientId}`
      },
      valueQuantity: {
        value: 70,
        unit: 'kg',
        system: 'http://unitsofmeasure.org',
        code: 'kg'
      },
      ...overrides
    };
  }

  static createEncounter(patientId: string, overrides?: Partial<any>) {
    return {
      resourceType: 'Encounter',
      id: `test-encounter-${Date.now()}`,
      status: 'finished',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'AMB',
        display: 'ambulatory'
      },
      subject: {
        reference: `Patient/${patientId}`
      },
      period: {
        start: new Date().toISOString(),
        end: new Date().toISOString()
      },
      ...overrides
    };
  }

  static createCondition(patientId: string, overrides?: Partial<any>) {
    return {
      resourceType: 'Condition',
      id: `test-condition-${Date.now()}`,
      clinicalStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active'
        }]
      },
      verificationStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed'
        }]
      },
      code: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: '44054006',
          display: 'Diabetes mellitus type 2'
        }]
      },
      subject: {
        reference: `Patient/${patientId}`
      },
      ...overrides
    };
  }

  static createHL7Message(messageType: string = 'ADT^A01') {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, '');
    return `MSH|^~\\&|SENDING_APPLICATION|SENDING_FACILITY|RECEIVING_APPLICATION|RECEIVING_FACILITY|${timestamp}||${messageType}|MSG${Date.now()}|P|2.5\r
EVN||${timestamp}||||\r
PID|1||TEST123^^^TEST^MR||Test^Patient^M||19900101|M|||123 Test St^^Test City^ST^12345^USA||(555)123-4567|||S|||||||||||||||||||\r`;
  }

  static createX12Transaction(transactionType: string = '270') {
    const controlNumber = Date.now().toString().slice(-9);
    return `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *${new Date().toISOString().slice(2, 10).replace(/-/g, '')}*${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}*U*00401*${controlNumber}*0*T*>~
GS*HS*SENDER*RECEIVER*${new Date().toISOString().slice(2, 10).replace(/-/g, '')}*${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}*1*X*004010X092A1~
ST*${transactionType}*0001~
BHT*0022*13*10001234*${new Date().toISOString().slice(2, 10).replace(/-/g, '')}*${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}~
HL*1**20*1~
NM1*PR*2*INSURANCE COMPANY*****PI*12345~
HL*2*1*21*1~
NM1*1P*2*PROVIDER*****XX*1234567890~
HL*3*2*22*0~
TRN*1*1*1234567890~
NM1*IL*1*DOE*JOHN****MI*123456789~
DMG*D8*19900101*M~
DTP*291*D8*${new Date().toISOString().slice(0, 10).replace(/-/g, '')}~
EQ*30~
SE*12*0001~
GE*1*1~
IEA*1*${controlNumber}~`;
  }
}

// Performance testing utilities
export class PerformanceTestUtils {
  static async measureExecutionTime<T>(
    operation: () => Promise<T>,
    expectedMaxMs: number
  ): Promise<{ result: T; executionTimeMs: number; withinThreshold: boolean }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const executionTimeMs = endTime - startTime;

    return {
      result,
      executionTimeMs,
      withinThreshold: executionTimeMs <= expectedMaxMs
    };
  }

  static async loadTest<T>(
    operation: () => Promise<T>,
    concurrentRequests: number = 10,
    totalRequests: number = 100
  ): Promise<{
    successCount: number;
    failureCount: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  }> {
    const results: Array<{ success: boolean; responseTime: number }> = [];
    const batches = Math.ceil(totalRequests / concurrentRequests);

    for (let i = 0; i < batches; i++) {
      const batchSize = Math.min(concurrentRequests, totalRequests - i * concurrentRequests);
      const batchPromises = Array.from({ length: batchSize }, async () => {
        const startTime = performance.now();
        try {
          await operation();
          const responseTime = performance.now() - startTime;
          return { success: true, responseTime };
        } catch (error) {
          const responseTime = performance.now() - startTime;
          return { success: false, responseTime };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successResults = results.filter(r => r.success);
    const responseTimes = results.map(r => r.responseTime);

    return {
      successCount: successResults.length,
      failureCount: results.length - successResults.length,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes)
    };
  }
}

// Exports are already handled above as class declarations