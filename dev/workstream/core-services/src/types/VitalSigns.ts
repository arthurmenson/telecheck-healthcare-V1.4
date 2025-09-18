import { z } from 'zod';

export const VitalSignsSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  measurementDate: z.string().datetime(),
  measuredBy: z.string(),
  deviceId: z.string().optional(),
  location: z.string().optional(), // e.g., "Room 101", "Home", "Ambulance"

  // Core vital signs
  bloodPressure: z.object({
    systolic: z.number().positive(),
    diastolic: z.number().positive(),
    unit: z.literal('mmHg').default('mmHg'),
    position: z.enum(['sitting', 'standing', 'lying']).optional(),
    cuffSize: z.enum(['small', 'regular', 'large', 'xl']).optional()
  }).optional(),

  heartRate: z.object({
    bpm: z.number().positive(),
    rhythm: z.enum(['regular', 'irregular', 'atrial_fibrillation', 'bradycardia', 'tachycardia']).optional(),
    method: z.enum(['palpation', 'auscultation', 'monitor', 'pulse_oximeter']).optional()
  }).optional(),

  respiratoryRate: z.object({
    rpm: z.number().positive(), // respirations per minute
    quality: z.enum(['normal', 'shallow', 'deep', 'labored', 'irregular']).optional(),
    oxygenSupport: z.boolean().default(false),
    oxygenFlow: z.number().nonnegative().optional() // L/min
  }).optional(),

  temperature: z.object({
    value: z.number(),
    unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
    site: z.enum(['oral', 'rectal', 'axillary', 'tympanic', 'temporal', 'core']).optional(),
    method: z.enum(['digital', 'mercury', 'infrared', 'probe']).optional()
  }).optional(),

  oxygenSaturation: z.object({
    percentage: z.number().min(0).max(100),
    method: z.enum(['pulse_oximetry', 'arterial_blood_gas']).default('pulse_oximetry'),
    onRoomAir: z.boolean().default(true),
    oxygenSupport: z.object({
      type: z.enum(['nasal_cannula', 'mask', 'ventilator', 'cpap', 'bipap']),
      flow: z.number().nonnegative(), // L/min or % for ventilator
      fio2: z.number().min(21).max(100).optional() // Fraction of inspired oxygen
    }).optional()
  }).optional(),

  // Additional measurements
  weight: z.object({
    value: z.number().positive(),
    unit: z.enum(['kg', 'lbs']).default('kg'),
    clothed: z.boolean().default(true)
  }).optional(),

  height: z.object({
    value: z.number().positive(),
    unit: z.enum(['cm', 'inches', 'feet']).default('cm')
  }).optional(),

  bmi: z.object({
    value: z.number().positive(),
    category: z.enum(['underweight', 'normal', 'overweight', 'obese_class_1', 'obese_class_2', 'obese_class_3']).optional()
  }).optional(),

  painLevel: z.object({
    scale: z.enum(['0-10', 'faces', 'behavioral']).default('0-10'),
    score: z.number().min(0).max(10),
    location: z.string().optional(),
    quality: z.array(z.enum(['sharp', 'dull', 'burning', 'aching', 'stabbing', 'throbbing', 'cramping'])).optional()
  }).optional(),

  glucoseLevel: z.object({
    value: z.number().positive(),
    unit: z.enum(['mg/dL', 'mmol/L']).default('mg/dL'),
    timing: z.enum(['fasting', 'random', 'post_meal', 'bedtime', '2hr_post_meal']).optional(),
    method: z.enum(['fingerstick', 'venous', 'arterial', 'continuous_monitor']).default('fingerstick')
  }).optional(),

  // Consciousness and neurological
  consciousnessLevel: z.enum(['alert', 'drowsy', 'confused', 'unresponsive']).optional(),
  glasgowComaScale: z.object({
    eye: z.number().min(1).max(4),
    verbal: z.number().min(1).max(5),
    motor: z.number().min(1).max(6),
    total: z.number().min(3).max(15)
  }).optional(),

  // Assessment and alerts
  alerts: z.array(z.object({
    type: z.enum(['critical', 'high', 'low', 'abnormal']),
    parameter: z.string(),
    message: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical'])
  })).default([]),

  trends: z.object({
    bloodPressure: z.enum(['improving', 'stable', 'deteriorating']).optional(),
    heartRate: z.enum(['improving', 'stable', 'deteriorating']).optional(),
    temperature: z.enum(['improving', 'stable', 'deteriorating']).optional(),
    overall: z.enum(['improving', 'stable', 'deteriorating']).optional()
  }).optional(),

  clinicalSignificance: z.object({
    normalForPatient: z.boolean().default(true),
    actionRequired: z.boolean().default(false),
    physicianNotified: z.boolean().default(false),
    interventions: z.array(z.string()).optional()
  }).optional(),

  notes: z.string().optional(),
  verified: z.boolean().default(false),
  verifiedBy: z.string().optional(),

  fhirCompliant: z.object({
    resourceType: z.literal('Observation'),
    category: z.array(z.object({
      coding: z.array(z.object({
        system: z.string(),
        code: z.string(),
        display: z.string()
      }))
    }))
  }).optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type VitalSigns = z.infer<typeof VitalSignsSchema>;

export const CreateVitalSignsSchema = VitalSignsSchema.omit({
  id: true,
  bmi: true, // Auto-calculated from height/weight
  alerts: true, // Auto-generated based on values
  trends: true, // Auto-calculated from historical data
  createdAt: true,
  updatedAt: true
});

export type CreateVitalSigns = z.infer<typeof CreateVitalSignsSchema>;

export const UpdateVitalSignsSchema = CreateVitalSignsSchema.partial();

export type UpdateVitalSigns = z.infer<typeof UpdateVitalSignsSchema>;

// Normal ranges for vital signs (adult ranges)
export const VitalSignsNormalRanges = {
  bloodPressure: {
    systolic: { min: 90, max: 140, optimal: { min: 90, max: 120 } },
    diastolic: { min: 60, max: 90, optimal: { min: 60, max: 80 } }
  },
  heartRate: {
    min: 60, max: 100, // beats per minute
    bradycardia: { max: 60 },
    tachycardia: { min: 100 }
  },
  respiratoryRate: {
    min: 12, max: 20 // respirations per minute
  },
  temperature: {
    celsius: {
      min: 36.1, max: 37.2, // Normal range
      fever: { min: 37.8 },
      hypothermia: { max: 35.0 }
    },
    fahrenheit: {
      min: 97.0, max: 99.0,
      fever: { min: 100.4 },
      hypothermia: { max: 95.0 }
    }
  },
  oxygenSaturation: {
    min: 95, max: 100, // percentage
    critical: { max: 90 }
  },
  painLevel: {
    mild: { min: 1, max: 3 },
    moderate: { min: 4, max: 6 },
    severe: { min: 7, max: 10 }
  },
  glucoseLevel: {
    'mg/dL': {
      fasting: { min: 70, max: 100 },
      random: { min: 70, max: 140 },
      post_meal: { min: 70, max: 180 }
    },
    'mmol/L': {
      fasting: { min: 3.9, max: 5.6 },
      random: { min: 3.9, max: 7.8 },
      post_meal: { min: 3.9, max: 10.0 }
    }
  }
} as const;