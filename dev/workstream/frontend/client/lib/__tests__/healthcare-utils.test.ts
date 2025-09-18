import { describe, it, expect } from 'vitest';
import {
  calculateBMI,
  calculateAge,
  classifyBloodPressure,
  classifyHeartRate,
  calculatePediatricDosage,
  validateVitalSigns,
  HealthcareUnitConverter
} from '../healthcare-utils';

describe('Healthcare Utilities - TDD Implementation', () => {

  describe('BMI Calculator', () => {
    it('should calculate BMI correctly for normal weight', () => {
      // Arrange & Act
      const result = calculateBMI(70, 175); // 70kg, 175cm

      // Assert
      expect(result.bmi).toBe(22.9);
      expect(result.category).toBe('normal');
      expect(result.healthRisk).toBe('normal');
    });

    it('should classify underweight BMI correctly', () => {
      // Arrange & Act
      const result = calculateBMI(45, 170); // 45kg, 170cm

      // Assert
      expect(result.bmi).toBe(15.6);
      expect(result.category).toBe('underweight');
      expect(result.healthRisk).toBe('high');
    });

    it('should classify obese BMI correctly', () => {
      // Arrange & Act
      const result = calculateBMI(100, 170); // 100kg, 170cm

      // Assert
      expect(result.bmi).toBe(34.6);
      expect(result.category).toBe('obese');
      expect(result.healthRisk).toBe('very_high');
    });

    it('should reject invalid weight values', () => {
      // Assert
      expect(() => calculateBMI(-5, 170)).toThrow('Weight must be a positive number');
      expect(() => calculateBMI(0, 170)).toThrow('Weight must be a positive number');
      expect(() => calculateBMI(1500, 170)).toThrow('Weight seems unrealistic');
    });

    it('should reject invalid height values', () => {
      // Assert
      expect(() => calculateBMI(70, 0)).toThrow('Height must be a positive number');
      expect(() => calculateBMI(70, 30)).toThrow('Height seems unrealistic');
      expect(() => calculateBMI(70, 350)).toThrow('Height seems unrealistic');
    });

    it('should handle edge cases near category boundaries', () => {
      // Normal/Overweight boundary (BMI 25)
      const result1 = calculateBMI(76.6, 175); // BMI exactly 25.0
      expect(result1.category).toBe('overweight');

      // Overweight/Obese boundary (BMI 30)
      const result2 = calculateBMI(91.9, 175); // BMI exactly 30.0
      expect(result2.category).toBe('obese');
    });
  });

  describe('Age Calculator', () => {
    it('should calculate age correctly for string date input', () => {
      // Arrange
      const birthDate = '1990-06-15';
      const mockCurrentDate = new Date('2024-06-20');
      const originalDate = Date;

      // Mock Date constructor
      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(mockCurrentDate);
          } else {
            super(...args);
          }
        }
      } as any;

      try {
        // Act
        const age = calculateAge(birthDate);

        // Assert
        expect(age).toBe(34);
      } finally {
        global.Date = originalDate;
      }
    });

    it('should calculate age correctly for Date object input', () => {
      // Arrange
      const birthDate = new Date('1985-12-25');
      const mockCurrentDate = new Date('2024-01-15');
      const originalDate = Date;

      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(mockCurrentDate);
          } else {
            super(...args);
          }
        }
      } as any;

      try {
        // Act
        const age = calculateAge(birthDate);

        // Assert
        expect(age).toBe(38); // Birthday hasn't passed yet in 2024
      } finally {
        global.Date = originalDate;
      }
    });

    it('should handle birthday not yet occurred this year', () => {
      // Arrange
      const birthDate = '1990-12-25';
      const mockCurrentDate = new Date('2024-06-15');
      const originalDate = Date;

      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(mockCurrentDate);
          } else {
            super(...args);
          }
        }
      } as any;

      try {
        // Act
        const age = calculateAge(birthDate);

        // Assert
        expect(age).toBe(33); // Birthday hasn't passed yet
      } finally {
        global.Date = originalDate;
      }
    });

    it('should reject future birth dates', () => {
      // Arrange
      const futureBirthDate = '2030-01-01';

      // Assert
      expect(() => calculateAge(futureBirthDate)).toThrow('Date of birth cannot be in the future');
    });

    it('should reject invalid date strings', () => {
      // Assert
      expect(() => calculateAge('invalid-date')).toThrow('Invalid date of birth');
      expect(() => calculateAge('')).toThrow('Invalid date of birth');
    });
  });

  describe('Blood Pressure Classification', () => {
    it('should classify normal blood pressure correctly', () => {
      // Act
      const result = classifyBloodPressure(120, 75);

      // Assert
      expect(result.category).toBe('Normal');
      expect(result.severity).toBe('normal');
      expect(result.recommendations).toContain('Maintain healthy lifestyle');
    });

    it('should classify elevated blood pressure correctly', () => {
      // Act
      const result = classifyBloodPressure(125, 78);

      // Assert
      expect(result.category).toBe('Elevated');
      expect(result.severity).toBe('elevated');
      expect(result.recommendations).toContain('Lifestyle modifications recommended');
    });

    it('should classify stage 1 hypertension correctly', () => {
      // Act
      const result = classifyBloodPressure(135, 85);

      // Assert
      expect(result.category).toBe('High Blood Pressure Stage 1');
      expect(result.severity).toBe('stage1');
      expect(result.recommendations).toContain('Consult healthcare provider');
    });

    it('should classify stage 2 hypertension correctly', () => {
      // Act
      const result = classifyBloodPressure(145, 95);

      // Assert
      expect(result.category).toBe('High Blood Pressure Stage 2');
      expect(result.severity).toBe('stage2');
      expect(result.recommendations).toContain('Medication likely required');
    });

    it('should classify hypertensive crisis correctly', () => {
      // Act
      const result = classifyBloodPressure(185, 115);

      // Assert
      expect(result.category).toBe('Hypertensive Crisis');
      expect(result.severity).toBe('crisis');
      expect(result.recommendations).toContain('Seek emergency medical attention immediately');
    });

    it('should reject unrealistic blood pressure values', () => {
      // Assert
      expect(() => classifyBloodPressure(400, 80)).toThrow('Blood pressure values seem unrealistic');
      expect(() => classifyBloodPressure(120, 250)).toThrow('Blood pressure values seem unrealistic');
      expect(() => classifyBloodPressure(20, 80)).toThrow('Blood pressure values seem unrealistic');
    });

    it('should require valid numeric inputs', () => {
      // Assert
      expect(() => classifyBloodPressure(NaN, 80)).toThrow('Blood pressure values must be valid numbers');
      expect(() => classifyBloodPressure(120, Infinity)).toThrow('Blood pressure values must be valid numbers');
    });
  });

  describe('Heart Rate Classification', () => {
    it('should classify normal adult heart rate correctly', () => {
      // Act
      const result = classifyHeartRate(75, 30);

      // Assert
      expect(result.category).toBe('Normal');
      expect(result.isNormal).toBe(true);
      expect(result.recommendations).toContain('Heart rate within normal range');
    });

    it('should classify adult bradycardia correctly', () => {
      // Act
      const result = classifyHeartRate(50, 25);

      // Assert
      expect(result.category).toBe('Bradycardia (Low Heart Rate)');
      expect(result.isNormal).toBe(false);
      expect(result.recommendations).toContain('Consult healthcare provider');
    });

    it('should classify adult tachycardia correctly', () => {
      // Act
      const result = classifyHeartRate(110, 35);

      // Assert
      expect(result.category).toBe('Tachycardia (High Heart Rate)');
      expect(result.isNormal).toBe(false);
      expect(result.recommendations).toContain('Consult healthcare provider if persistent');
    });

    it('should use different ranges for children', () => {
      // Act - Infant (under 1 year)
      const infantResult = classifyHeartRate(130, 0.5);

      // Assert
      expect(infantResult.isNormal).toBe(true);
      expect(infantResult.category).toBe('Normal');

      // This same heart rate would be tachycardia in adults
      const adultResult = classifyHeartRate(130, 30);
      expect(adultResult.isNormal).toBe(false);
    });

    it('should reject unrealistic heart rate values', () => {
      // Assert
      expect(() => classifyHeartRate(300, 25)).toThrow('Heart rate seems unrealistic');
      expect(() => classifyHeartRate(15, 25)).toThrow('Heart rate seems unrealistic');
    });

    it('should reject invalid age values', () => {
      // Assert
      expect(() => classifyHeartRate(75, -5)).toThrow('Age seems unrealistic');
      expect(() => classifyHeartRate(75, 200)).toThrow('Age seems unrealistic');
    });
  });

  describe('Pediatric Dosage Calculator', () => {
    it('should calculate acetaminophen dosage correctly', () => {
      // Act
      const result = calculatePediatricDosage('acetaminophen', 20, 5);

      // Assert
      expect(result.dose).toBe(300); // 20kg * 15mg/kg
      expect(result.unit).toBe('mg');
      expect(result.frequency).toBe('every 4-6 hours as needed');
      expect(result.notes).toContain('Maximum 5 doses per 24 hours');
    });

    it('should calculate ibuprofen dosage correctly', () => {
      // Act
      const result = calculatePediatricDosage('ibuprofen', 15, 3);

      // Assert
      expect(result.dose).toBe(150); // 15kg * 10mg/kg
      expect(result.unit).toBe('mg');
      expect(result.frequency).toBe('every 6-8 hours as needed');
      expect(result.notes).toContain('Take with food to reduce stomach upset');
    });

    it('should calculate amoxicillin dosage correctly', () => {
      // Act
      const result = calculatePediatricDosage('amoxicillin', 12, 2);

      // Assert
      expect(result.dose).toBe(300); // 12kg * 25mg/kg
      expect(result.unit).toBe('mg');
      expect(result.frequency).toBe('twice daily');
      expect(result.notes).toContain('Complete full course as prescribed');
    });

    it('should reject ibuprofen for infants under 6 months', () => {
      // Assert
      expect(() => calculatePediatricDosage('ibuprofen', 5, 0.3)).toThrow(
        'Ibuprofen not recommended for infants under 6 months'
      );
    });

    it('should reject adult patients', () => {
      // Assert
      expect(() => calculatePediatricDosage('acetaminophen', 70, 25)).toThrow(
        'This calculator is for pediatric patients only'
      );
    });

    it('should warn about very low weights', () => {
      // Act
      const result = calculatePediatricDosage('acetaminophen', 1.5, 0.1);

      // Assert
      expect(result.notes).toContain('CAUTION: Very low weight');
    });

    it('should throw error for unknown medications', () => {
      // Assert
      expect(() => calculatePediatricDosage('unknown-drug', 10, 5)).toThrow(
        'Dosing information not available for unknown-drug'
      );
    });

    it('should handle case-insensitive medication names', () => {
      // Act
      const result1 = calculatePediatricDosage('ACETAMINOPHEN', 10, 3);
      const result2 = calculatePediatricDosage('acetaminophen', 10, 3);

      // Assert
      expect(result1.dose).toBe(result2.dose);
      expect(result1.unit).toBe(result2.unit);
    });
  });

  describe('Vital Signs Validation', () => {
    it('should validate normal vital signs', () => {
      // Arrange
      const vitals = {
        systolic: 120,
        diastolic: 80,
        heartRate: 75,
        temperature: 36.5,
        respiratoryRate: 16,
        oxygenSaturation: 98
      };

      // Act
      const result = validateVitalSigns(vitals, 30);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect blood pressure inconsistencies', () => {
      // Arrange
      const vitals = {
        systolic: 80, // Lower than diastolic
        diastolic: 120,
        heartRate: 75
      };

      // Act
      const result = validateVitalSigns(vitals, 30);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Systolic pressure must be higher than diastolic');
    });

    it('should require both systolic and diastolic when one is provided', () => {
      // Arrange
      const vitals = {
        systolic: 120
        // Missing diastolic
      };

      // Act
      const result = validateVitalSigns(vitals, 30);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Both systolic and diastolic blood pressure required');
    });

    it('should warn about hypertensive crisis', () => {
      // Arrange
      const vitals = {
        systolic: 190,
        diastolic: 125,
        heartRate: 75
      };

      // Act
      const result = validateVitalSigns(vitals, 30);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('CRITICAL: Hypertensive crisis - immediate medical attention required');
    });

    it('should warn about fever', () => {
      // Arrange
      const vitals = {
        temperature: 38.5,
        heartRate: 75
      };

      // Act
      const result = validateVitalSigns(vitals, 30);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Fever detected - temperature ≥38.0°C');
    });

    it('should warn about hypothermia', () => {
      // Arrange
      const vitals = {
        temperature: 34.5,
        heartRate: 75
      };

      // Act
      const result = validateVitalSigns(vitals, 30);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Hypothermia risk - temperature ≤35.0°C');
    });

    it('should warn about severe hypoxemia', () => {
      // Arrange
      const vitals = {
        oxygenSaturation: 85,
        heartRate: 75
      };

      // Act
      const result = validateVitalSigns(vitals, 30);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('CRITICAL: Severe hypoxemia - oxygen saturation <90%');
    });

    it('should validate age-specific respiratory rates', () => {
      // Arrange - Adult with child's respiratory rate
      const vitals = {
        respiratoryRate: 35, // Normal for child, high for adult
        heartRate: 75
      };

      // Act
      const result = validateVitalSigns(vitals, 25);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Respiratory rate outside normal range for age');
    });

    it('should reject invalid age', () => {
      // Arrange
      const vitals = { heartRate: 75 };

      // Act
      const result = validateVitalSigns(vitals, -5);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid age is required');
    });
  });

  describe('Healthcare Unit Converter', () => {
    it('should convert Celsius to Fahrenheit correctly', () => {
      // Act & Assert
      expect(HealthcareUnitConverter.celsiusToFahrenheit(37)).toBe(98.6);
      expect(HealthcareUnitConverter.celsiusToFahrenheit(0)).toBe(32.0);
      expect(HealthcareUnitConverter.celsiusToFahrenheit(100)).toBe(212.0);
    });

    it('should convert Fahrenheit to Celsius correctly', () => {
      // Act & Assert
      expect(HealthcareUnitConverter.fahrenheitToCelsius(98.6)).toBe(37.0);
      expect(HealthcareUnitConverter.fahrenheitToCelsius(32)).toBe(0.0);
      expect(HealthcareUnitConverter.fahrenheitToCelsius(212)).toBe(100.0);
    });

    it('should convert pounds to kilograms correctly', () => {
      // Act & Assert
      expect(HealthcareUnitConverter.poundsToKg(220)).toBe(99.8);
      expect(HealthcareUnitConverter.poundsToKg(154)).toBe(69.9);
    });

    it('should convert kilograms to pounds correctly', () => {
      // Act & Assert
      expect(HealthcareUnitConverter.kgToPounds(70)).toBe(154.3);
      expect(HealthcareUnitConverter.kgToPounds(100)).toBe(220.5);
    });

    it('should convert inches to centimeters correctly', () => {
      // Act & Assert
      expect(HealthcareUnitConverter.inchesToCm(69)).toBe(175.3);
      expect(HealthcareUnitConverter.inchesToCm(72)).toBe(182.9);
    });

    it('should convert centimeters to inches correctly', () => {
      // Act & Assert
      expect(HealthcareUnitConverter.cmToInches(175)).toBe(68.9);
      expect(HealthcareUnitConverter.cmToInches(183)).toBe(72.0);
    });

    it('should convert feet and inches to centimeters correctly', () => {
      // Act & Assert
      expect(HealthcareUnitConverter.feetAndInchesToCm(5, 9)).toBe(175.3); // 5'9"
      expect(HealthcareUnitConverter.feetAndInchesToCm(6, 0)).toBe(182.9); // 6'0"
    });

    it('should reject negative weight values', () => {
      // Assert
      expect(() => HealthcareUnitConverter.poundsToKg(-10)).toThrow('Invalid weight value');
      expect(() => HealthcareUnitConverter.kgToPounds(-5)).toThrow('Invalid weight value');
    });

    it('should reject negative height values', () => {
      // Assert
      expect(() => HealthcareUnitConverter.inchesToCm(-5)).toThrow('Invalid height value');
      expect(() => HealthcareUnitConverter.feetAndInchesToCm(-1, 6)).toThrow('Invalid height values');
    });

    it('should reject invalid temperature values', () => {
      // Assert
      expect(() => HealthcareUnitConverter.celsiusToFahrenheit(NaN)).toThrow('Invalid temperature value');
      expect(() => HealthcareUnitConverter.fahrenheitToCelsius(Infinity)).toThrow('Invalid temperature value');
    });
  });
});