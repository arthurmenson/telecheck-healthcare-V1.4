/**
 * Healthcare Utility Functions
 * Clean Code principles applied:
 * - Single Responsibility Principle
 * - Pure functions with no side effects
 * - Comprehensive error handling
 * - Type safety
 * - Self-documenting code
 */

// Type definitions for healthcare calculations
export interface VitalSigns {
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
}

export interface BMIResult {
  bmi: number;
  category: 'underweight' | 'normal' | 'overweight' | 'obese';
  healthRisk: 'low' | 'normal' | 'increased' | 'high' | 'very_high';
}

export interface MedicationDosage {
  weight: number; // kg
  age: number; // years
  medication: string;
  baseUnit: string;
}

export interface DosageResult {
  dose: number;
  unit: string;
  frequency: string;
  notes: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Body Mass Index (BMI) Calculator
 * Formula: BMI = weight (kg) / (height (m))²
 */
export function calculateBMI(weightKg: number, heightCm: number): BMIResult {
  // Input validation
  if (!isValidNumber(weightKg) || weightKg <= 0) {
    throw new Error('Weight must be a positive number');
  }

  if (!isValidNumber(heightCm) || heightCm <= 0) {
    throw new Error('Height must be a positive number');
  }

  if (weightKg > 1000) {
    throw new Error('Weight seems unrealistic (>1000kg)');
  }

  if (heightCm < 50 || heightCm > 300) {
    throw new Error('Height seems unrealistic (outside 50-300cm range)');
  }

  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  return {
    bmi,
    category: getBMICategory(bmi),
    healthRisk: getBMIHealthRisk(bmi)
  };
}

/**
 * Age Calculator from Date of Birth
 * Handles leap years and edge cases
 */
export function calculateAge(dateOfBirth: string | Date): number {
  try {
    const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;

    if (isNaN(birthDate.getTime())) {
      throw new Error('Invalid date of birth');
    }

    const today = new Date();

    if (birthDate > today) {
      throw new Error('Date of birth cannot be in the future');
    }

    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Adjust for birthday not yet passed this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }

    return age;
  } catch (error) {
    console.error('[HealthcareUtils] Error calculating age:', error);
    throw error;
  }
}

/**
 * Blood Pressure Classification
 * Based on American Heart Association guidelines
 */
export function classifyBloodPressure(systolic: number, diastolic: number): {
  category: string;
  severity: 'normal' | 'elevated' | 'stage1' | 'stage2' | 'crisis';
  recommendations: string[];
} {
  if (!isValidNumber(systolic) || !isValidNumber(diastolic)) {
    throw new Error('Blood pressure values must be valid numbers');
  }

  if (systolic < 50 || systolic > 300 || diastolic < 30 || diastolic > 200) {
    throw new Error('Blood pressure values seem unrealistic');
  }

  if (systolic >= 180 || diastolic >= 120) {
    return {
      category: 'Hypertensive Crisis',
      severity: 'crisis',
      recommendations: [
        'Seek emergency medical attention immediately',
        'Do not wait to see if pressure comes down',
        'Call 911 if experiencing chest pain, shortness of breath, or stroke symptoms'
      ]
    };
  }

  if (systolic >= 140 || diastolic >= 90) {
    return {
      category: 'High Blood Pressure Stage 2',
      severity: 'stage2',
      recommendations: [
        'Consult healthcare provider immediately',
        'Medication likely required',
        'Lifestyle modifications essential'
      ]
    };
  }

  if (systolic >= 130 || diastolic >= 80) {
    return {
      category: 'High Blood Pressure Stage 1',
      severity: 'stage1',
      recommendations: [
        'Consult healthcare provider',
        'Lifestyle modifications recommended',
        'Monitor regularly'
      ]
    };
  }

  if (systolic >= 120 && diastolic < 80) {
    return {
      category: 'Elevated',
      severity: 'elevated',
      recommendations: [
        'Lifestyle modifications recommended',
        'Regular monitoring',
        'Dietary changes may help'
      ]
    };
  }

  return {
    category: 'Normal',
    severity: 'normal',
    recommendations: [
      'Maintain healthy lifestyle',
      'Continue regular check-ups'
    ]
  };
}

/**
 * Heart Rate Classification by Age Group
 * Accounts for normal variations by age
 */
export function classifyHeartRate(heartRate: number, age: number): {
  category: string;
  isNormal: boolean;
  recommendations: string[];
} {
  if (!isValidNumber(heartRate) || !isValidNumber(age)) {
    throw new Error('Heart rate and age must be valid numbers');
  }

  if (heartRate < 30 || heartRate > 250) {
    throw new Error('Heart rate seems unrealistic (30-250 bpm range expected)');
  }

  if (age < 0 || age > 150) {
    throw new Error('Age seems unrealistic');
  }

  // Normal ranges by age group
  let normalRange: [number, number];

  if (age < 1) {
    normalRange = [100, 160];
  } else if (age < 3) {
    normalRange = [90, 150];
  } else if (age < 12) {
    normalRange = [80, 120];
  } else if (age < 18) {
    normalRange = [70, 100];
  } else {
    normalRange = [60, 100];
  }

  const [minNormal, maxNormal] = normalRange;

  if (heartRate < minNormal) {
    return {
      category: 'Bradycardia (Low Heart Rate)',
      isNormal: false,
      recommendations: [
        'Consult healthcare provider',
        'May indicate underlying condition',
        'Monitor for symptoms like dizziness or fatigue'
      ]
    };
  }

  if (heartRate > maxNormal) {
    return {
      category: 'Tachycardia (High Heart Rate)',
      isNormal: false,
      recommendations: [
        'Consult healthcare provider if persistent',
        'Could be due to activity, stress, or medical condition',
        'Monitor and track patterns'
      ]
    };
  }

  return {
    category: 'Normal',
    isNormal: true,
    recommendations: [
      'Heart rate within normal range',
      'Continue healthy lifestyle'
    ]
  };
}

/**
 * Medication Dosage Calculator (Pediatric Weight-Based)
 * Common pediatric medications with safety checks
 */
export function calculatePediatricDosage(
  medicationName: string,
  weightKg: number,
  age: number
): DosageResult {
  if (!isValidNumber(weightKg) || weightKg <= 0) {
    throw new Error('Weight must be a positive number');
  }

  if (!isValidNumber(age) || age < 0) {
    throw new Error('Age must be a non-negative number');
  }

  if (age > 18) {
    throw new Error('This calculator is for pediatric patients only (age ≤ 18)');
  }

  const medication = medicationName.toLowerCase().trim();
  const notes: string[] = [];

  // Safety check for weight ranges
  if (weightKg < 2) {
    notes.push('CAUTION: Very low weight - verify dosing with neonatologist');
  }

  if (weightKg > 100) {
    notes.push('Consider adult dosing protocols for weight >100kg');
  }

  switch (medication) {
    case 'acetaminophen':
    case 'paracetamol':
      const acetaminophenDose = weightKg * 15; // 15mg/kg
      return {
        dose: Math.round(acetaminophenDose),
        unit: 'mg',
        frequency: 'every 4-6 hours as needed',
        notes: [
          ...notes,
          'Maximum 5 doses per 24 hours',
          'Do not exceed 80mg/kg per day',
          'Check for other acetaminophen-containing products'
        ]
      };

    case 'ibuprofen':
      if (age < 0.5) {
        throw new Error('Ibuprofen not recommended for infants under 6 months');
      }
      const ibuprofenDose = weightKg * 10; // 10mg/kg
      return {
        dose: Math.round(ibuprofenDose),
        unit: 'mg',
        frequency: 'every 6-8 hours as needed',
        notes: [
          ...notes,
          'Maximum 3-4 doses per 24 hours',
          'Take with food to reduce stomach upset',
          'Not for infants under 6 months'
        ]
      };

    case 'amoxicillin':
      const amoxicillinDose = weightKg * 25; // 25mg/kg twice daily
      return {
        dose: Math.round(amoxicillinDose),
        unit: 'mg',
        frequency: 'twice daily',
        notes: [
          ...notes,
          'Complete full course as prescribed',
          'Check for penicillin allergies',
          'Can be taken with or without food'
        ]
      };

    default:
      throw new Error(`Dosing information not available for ${medicationName}`);
  }
}

/**
 * Validate Vital Signs
 * Comprehensive validation with contextual warnings
 */
export function validateVitalSigns(vitals: VitalSigns, age: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate inputs
  if (!isValidNumber(age) || age < 0) {
    errors.push('Valid age is required');
    return { isValid: false, errors, warnings };
  }

  // Blood pressure validation
  if (vitals.systolic !== undefined || vitals.diastolic !== undefined) {
    if (vitals.systolic === undefined || vitals.diastolic === undefined) {
      errors.push('Both systolic and diastolic blood pressure required');
    } else {
      if (vitals.systolic <= vitals.diastolic) {
        errors.push('Systolic pressure must be higher than diastolic');
      }

      if (vitals.systolic < 50 || vitals.systolic > 300) {
        errors.push('Systolic pressure outside realistic range (50-300 mmHg)');
      }

      if (vitals.diastolic < 30 || vitals.diastolic > 200) {
        errors.push('Diastolic pressure outside realistic range (30-200 mmHg)');
      }

      // Clinical warnings
      if (vitals.systolic >= 180 || vitals.diastolic >= 120) {
        warnings.push('CRITICAL: Hypertensive crisis - immediate medical attention required');
      }
    }
  }

  // Heart rate validation
  if (vitals.heartRate !== undefined) {
    if (vitals.heartRate < 30 || vitals.heartRate > 250) {
      errors.push('Heart rate outside realistic range (30-250 bpm)');
    }

    const hrClassification = classifyHeartRate(vitals.heartRate, age);
    if (!hrClassification.isNormal) {
      warnings.push(`Heart rate abnormal: ${hrClassification.category}`);
    }
  }

  // Temperature validation
  if (vitals.temperature !== undefined) {
    if (vitals.temperature < 32 || vitals.temperature > 45) {
      errors.push('Temperature outside survivable range (32-45°C)');
    }

    if (vitals.temperature >= 38.0) {
      warnings.push('Fever detected - temperature ≥38.0°C');
    }

    if (vitals.temperature <= 35.0) {
      warnings.push('Hypothermia risk - temperature ≤35.0°C');
    }
  }

  // Oxygen saturation validation
  if (vitals.oxygenSaturation !== undefined) {
    if (vitals.oxygenSaturation < 0 || vitals.oxygenSaturation > 100) {
      errors.push('Oxygen saturation must be between 0-100%');
    }

    if (vitals.oxygenSaturation < 90) {
      warnings.push('CRITICAL: Severe hypoxemia - oxygen saturation <90%');
    } else if (vitals.oxygenSaturation < 95) {
      warnings.push('Mild hypoxemia - oxygen saturation <95%');
    }
  }

  // Respiratory rate validation
  if (vitals.respiratoryRate !== undefined) {
    if (vitals.respiratoryRate < 5 || vitals.respiratoryRate > 60) {
      errors.push('Respiratory rate outside realistic range (5-60 breaths/min)');
    }

    // Age-specific respiratory rate warnings
    let normalRRRange: [number, number];
    if (age < 1) {
      normalRRRange = [30, 60];
    } else if (age < 3) {
      normalRRRange = [24, 40];
    } else if (age < 6) {
      normalRRRange = [22, 34];
    } else if (age < 12) {
      normalRRRange = [18, 30];
    } else {
      normalRRRange = [12, 20];
    }

    if (vitals.respiratoryRate < normalRRRange[0] || vitals.respiratoryRate > normalRRRange[1]) {
      warnings.push(`Respiratory rate outside normal range for age (${normalRRRange[0]}-${normalRRRange[1]} breaths/min)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Helper functions
function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

function getBMICategory(bmi: number): BMIResult['category'] {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

function getBMIHealthRisk(bmi: number): BMIResult['healthRisk'] {
  if (bmi < 16) return 'high'; // Severe underweight
  if (bmi < 18.5) return 'increased'; // Underweight
  if (bmi < 25) return 'normal'; // Normal weight
  if (bmi < 30) return 'increased'; // Overweight
  if (bmi < 35) return 'high'; // Obese Class I
  if (bmi < 40) return 'very_high'; // Obese Class II
  return 'very_high'; // Obese Class III
}

/**
 * Convert units commonly used in healthcare
 */
export const HealthcareUnitConverter = {
  // Temperature conversions
  celsiusToFahrenheit: (celsius: number): number => {
    if (!isValidNumber(celsius)) throw new Error('Invalid temperature value');
    return Number(((celsius * 9/5) + 32).toFixed(1));
  },

  fahrenheitToCelsius: (fahrenheit: number): number => {
    if (!isValidNumber(fahrenheit)) throw new Error('Invalid temperature value');
    return Number(((fahrenheit - 32) * 5/9).toFixed(1));
  },

  // Weight conversions
  poundsToKg: (pounds: number): number => {
    if (!isValidNumber(pounds) || pounds < 0) throw new Error('Invalid weight value');
    return Number((pounds * 0.453592).toFixed(1));
  },

  kgToPounds: (kg: number): number => {
    if (!isValidNumber(kg) || kg < 0) throw new Error('Invalid weight value');
    return Number((kg * 2.20462).toFixed(1));
  },

  // Height conversions
  inchesToCm: (inches: number): number => {
    if (!isValidNumber(inches) || inches < 0) throw new Error('Invalid height value');
    return Number((inches * 2.54).toFixed(1));
  },

  cmToInches: (cm: number): number => {
    if (!isValidNumber(cm) || cm < 0) throw new Error('Invalid height value');
    return Number((cm * 0.393701).toFixed(1));
  },

  feetAndInchesToCm: (feet: number, inches: number): number => {
    if (!isValidNumber(feet) || !isValidNumber(inches) || feet < 0 || inches < 0) {
      throw new Error('Invalid height values');
    }
    const totalInches = (feet * 12) + inches;
    return this.inchesToCm(totalInches);
  }
};