# TDD & Code Coverage Guide for Telecheck Healthcare Platform

## 🏥 Healthcare-Grade Development Standards

This guide establishes Test-Driven Development (TDD) and Code Coverage (CC) practices specifically designed for healthcare software development, ensuring patient safety and regulatory compliance.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [TDD Workflow](#tdd-workflow)
- [Code Coverage Standards](#code-coverage-standards)
- [Available Commands](#available-commands)
- [Healthcare-Specific Requirements](#healthcare-specific-requirements)
- [Subagent Configurations](#subagent-configurations)
- [Examples](#examples)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests
```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# TDD mode (watch + coverage)
npm run test:tdd
```

### 3. Start TDD Workflow
```bash
# Guided TDD workflow
npm run tdd:workflow

# Coverage dashboard
npm run coverage:dashboard
```

## 🔄 TDD Workflow

### Red-Green-Refactor Cycle

Our TDD implementation follows the healthcare-grade Red-Green-Refactor cycle:

#### 🔴 RED Phase: Write Failing Test
1. Write a test for new functionality
2. Ensure the test fails for the right reason
3. Focus on the desired behavior, not implementation

```typescript
// Example: Drug interaction checking test
it('should detect dangerous drug interactions', async () => {
  const medications = [
    { name: 'Warfarin', dosage: '5mg' },
    { name: 'Aspirin', dosage: '81mg' }
  ];

  const result = await MedicationService.checkDrugInteractions(medications);

  expect(result.hasInteractions).toBe(true);
  expect(result.interactions[0].severity).toBe('MAJOR');
});
```

#### 🟢 GREEN Phase: Make Test Pass
1. Write minimal code to make the test pass
2. Don't optimize yet - just make it work
3. Ensure all tests pass

```typescript
// Minimal implementation
static async checkDrugInteractions(medications) {
  // Simple implementation to make test pass
  const response = await apiClient.post('/interactions/check', { medications });
  return response.data.data;
}
```

#### 🔶 REFACTOR Phase: Improve Code Quality
1. Improve code structure and design
2. Add error handling and edge cases
3. Ensure tests still pass after each change

```typescript
// Refactored with error handling and safety
static async checkDrugInteractions(medications) {
  try {
    const response = await apiClient.post('/medications/interactions/check', {
      medications: medications.map(med => ({
        name: med.name,
        dosage: med.dosage,
        ndc: med.ndc
      }))
    });

    return response.data.data;
  } catch (error) {
    // Safety-first: When in doubt, assume potential interactions
    return {
      hasInteractions: true,
      interactions: [{
        severity: 'UNKNOWN',
        description: 'Unable to verify drug interactions due to system error.',
        recommendation: 'Manual review required before administering medications.',
        evidence: 'THEORETICAL',
        drugs: medications.map(m => m.name)
      }]
    };
  }
}
```

### TDD Best Practices for Healthcare

1. **Safety-First Error Handling**: Always fail safely when systems are unavailable
2. **Clear Test Names**: Use descriptive test names that explain clinical scenarios
3. **Edge Case Testing**: Test boundary conditions and error states
4. **Regulatory Compliance**: Ensure tests cover audit requirements

## 📊 Code Coverage Standards

### Coverage Thresholds

Our healthcare platform uses tiered coverage requirements:

| Module Type | Branches | Functions | Lines | Statements |
|-------------|----------|-----------|-------|------------|
| **Critical Services** | 95% | 95% | 95% | 95% |
| **API Client** | 100% | 100% | 100% | 100% |
| **Contexts** | 90% | 90% | 90% | 90% |
| **Hooks** | 85% | 85% | 85% | 85% |
| **Global** | 80% | 80% | 80% | 80% |

### Critical Healthcare Modules (100% Coverage Required)

- Patient data handling
- Medication management
- Authentication & authorization
- Data validation
- Error handling
- Audit logging

### Coverage Configuration

The coverage is configured in `vite.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  thresholds: {
    'client/services/**': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    'client/lib/api-client.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    }
  }
}
```

## 🛠️ Available Commands

### Testing Commands
```bash
# Basic testing
npm run test                    # Run tests once
npm run test:watch             # Run tests in watch mode
npm run test:run               # Run tests without watch mode

# Coverage commands
npm run test:coverage          # Generate coverage report
npm run test:coverage:watch    # Coverage in watch mode
npm run test:coverage:ui       # Interactive coverage UI

# TDD workflow
npm run test:tdd              # TDD mode (watch + coverage + verbose)
npm run tdd:workflow          # Guided TDD workflow script
npm run coverage:dashboard    # Coverage quality dashboard
```

### Development Workflow
```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

## 🏥 Healthcare-Specific Requirements

### Patient Safety Testing

All patient-related functionality must include:

1. **Data Validation Tests**: Ensure all patient data is properly validated
2. **Access Control Tests**: Verify role-based access permissions
3. **Audit Trail Tests**: Confirm all actions are logged
4. **Error Recovery Tests**: Verify graceful degradation

### HIPAA Compliance Testing

- Test data encryption in transit and at rest
- Verify access logging and audit trails
- Test session management and timeout handling
- Validate data anonymization in logs

### Drug Safety Testing

Critical for medication-related features:

```typescript
describe('Drug Interaction Safety', () => {
  it('should prevent dangerous combinations', async () => {
    // Test for contraindicated drug combinations
  });

  it('should handle allergy checking', () => {
    // Test allergy validation
  });

  it('should validate dosing limits', () => {
    // Test dosage validation
  });
});
```

## 🤖 Subagent Configurations

### TDD Workflow Agent

Located at `.claude/agents/tdd-workflow.md`

Features:
- Enforces Red-Green-Refactor cycle
- Healthcare-specific testing patterns
- Safety-first error handling validation
- HIPAA compliance checks

### Code Coverage Agent

Located at `.claude/agents/code-coverage.md`

Features:
- Monitors coverage thresholds
- Identifies critical uncovered paths
- Provides improvement recommendations
- Healthcare compliance validation

## 📝 Examples

### Example 1: Patient Service Test

```typescript
describe('PatientService', () => {
  it('should validate patient data before saving', async () => {
    const invalidPatient = { firstName: '', lastName: 'Doe' };

    const validation = PatientService.validatePatient(invalidPatient);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('First name is required');
  });
});
```

### Example 2: Medication Interaction Test

```typescript
describe('MedicationService', () => {
  it('should detect warfarin-aspirin interaction', async () => {
    const medications = [
      { name: 'Warfarin', dosage: '5mg' },
      { name: 'Aspirin', dosage: '81mg' }
    ];

    const result = await MedicationService.checkDrugInteractions(medications);

    expect(result.hasInteractions).toBe(true);
    expect(result.interactions[0].severity).toBe('MAJOR');
    expect(result.interactions[0].recommendation).toContain('Monitor INR');
  });
});
```

### Example 3: Authentication Test

```typescript
describe('AuthService', () => {
  it('should enforce role-based access', () => {
    const doctorUser = { role: 'doctor', permissions: ['read_patients'] };
    const patientUser = { role: 'patient', permissions: ['read_own_data'] };

    expect(AuthService.canAccessPatientData(doctorUser, 'patient-123')).toBe(true);
    expect(AuthService.canAccessPatientData(patientUser, 'patient-456')).toBe(false);
  });
});
```

## 🎯 Quality Metrics

### Current Coverage Status

Run `npm run coverage:dashboard` to see:

- Overall coverage percentages
- Critical path analysis
- Healthcare compliance status
- Improvement recommendations

### Coverage Reports

Coverage reports are generated in multiple formats:

- **Text**: Console output during test runs
- **HTML**: `coverage/index.html` - Interactive web report
- **JSON**: `coverage/coverage-final.json` - Machine-readable data
- **LCOV**: `coverage/lcov.info` - CI/CD integration

## 🔧 Integration with Development Workflow

### Pre-commit Hooks

Ensure quality standards with pre-commit hooks:

```bash
# Recommended .husky/pre-commit
npm run type-check
npm run lint
npm run test:run
```

### CI/CD Integration

For continuous integration:

```yaml
# GitHub Actions example
- name: Run Tests with Coverage
  run: npm run test:coverage

- name: Upload Coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
- [Healthcare Software Testing Standards](https://www.fda.gov/medical-devices/device-software-functions-including-mobile-medical-applications/software-medical-device-samd-clinical-evaluation)

## 🏁 Conclusion

This TDD and Code Coverage setup ensures:

✅ **Patient Safety**: Comprehensive testing of all healthcare workflows
✅ **Regulatory Compliance**: HIPAA and FDA software guidelines adherence
✅ **Quality Assurance**: Healthcare-grade code quality standards
✅ **Developer Experience**: Efficient TDD workflow with real-time feedback

For questions or improvements, refer to the healthcare IT SME documentation or create an issue in the project repository.