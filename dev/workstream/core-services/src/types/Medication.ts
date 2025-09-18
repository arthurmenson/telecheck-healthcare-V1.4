import { z } from 'zod';

export const MedicationSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  name: z.string().min(1),
  genericName: z.string().optional(),
  brandName: z.string().optional(),
  ndc: z.string().optional(), // National Drug Code
  rxNormCode: z.string().optional(),
  dosage: z.object({
    amount: z.number().positive(),
    unit: z.enum(['mg', 'g', 'ml', 'L', 'units', 'mcg', 'tablets', 'capsules']),
    frequency: z.string(), // e.g., "twice daily", "every 8 hours"
    route: z.enum(['oral', 'intravenous', 'intramuscular', 'subcutaneous', 'topical', 'inhalation', 'rectal']),
    instructions: z.string().optional()
  }),
  prescriber: z.object({
    name: z.string(),
    npi: z.string().optional(),
    dea: z.string().optional()
  }),
  pharmacy: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional()
  }).optional(),
  indication: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['active', 'completed', 'discontinued', 'suspended', 'cancelled']),
  interactions: z.array(z.object({
    medicationId: z.string().uuid(),
    medicationName: z.string(),
    severity: z.enum(['minor', 'moderate', 'major', 'contraindicated']),
    description: z.string(),
    clinicalEffects: z.array(z.string()),
    management: z.string().optional()
  })).default([]),
  sideEffects: z.array(z.object({
    effect: z.string(),
    severity: z.enum(['mild', 'moderate', 'severe']),
    frequency: z.enum(['rare', 'uncommon', 'common', 'very_common']),
    reported: z.boolean().default(false)
  })).default([]),
  allergies: z.array(z.object({
    allergen: z.string(),
    reaction: z.string(),
    severity: z.enum(['mild', 'moderate', 'severe', 'life_threatening'])
  })).default([]),
  refills: z.object({
    authorized: z.number().nonnegative(),
    remaining: z.number().nonnegative(),
    lastFilled: z.string().datetime().optional()
  }).optional(),
  cost: z.object({
    amount: z.number().nonnegative(),
    currency: z.string().default('USD'),
    insurance: z.object({
      covered: z.boolean(),
      copay: z.number().nonnegative().optional()
    }).optional()
  }).optional(),
  notes: z.string().optional(),
  fhirCompliant: z.object({
    resourceType: z.literal('MedicationRequest'),
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

export type Medication = z.infer<typeof MedicationSchema>;

export const CreateMedicationSchema = MedicationSchema.omit({
  id: true,
  interactions: true,
  createdAt: true,
  updatedAt: true
});

export type CreateMedication = z.infer<typeof CreateMedicationSchema>;

export const UpdateMedicationSchema = CreateMedicationSchema.partial();

export type UpdateMedication = z.infer<typeof UpdateMedicationSchema>;

// Drug interaction database (simplified)
export const DrugInteractionDatabase = {
  'warfarin': {
    interactions: [
      {
        drug: 'aspirin',
        severity: 'major' as const,
        description: 'Increased risk of bleeding',
        clinicalEffects: ['Bleeding', 'Bruising', 'Hemorrhage'],
        management: 'Monitor INR closely, consider alternative antiplatelet agent'
      },
      {
        drug: 'amoxicillin',
        severity: 'moderate' as const,
        description: 'May increase anticoagulant effect',
        clinicalEffects: ['Increased bleeding risk'],
        management: 'Monitor INR, adjust warfarin dose if needed'
      }
    ]
  },
  'metformin': {
    interactions: [
      {
        drug: 'iodinated contrast',
        severity: 'major' as const,
        description: 'Risk of lactic acidosis',
        clinicalEffects: ['Lactic acidosis', 'Kidney injury'],
        management: 'Discontinue metformin before contrast, resume after 48 hours if kidney function normal'
      }
    ]
  },
  'lisinopril': {
    interactions: [
      {
        drug: 'potassium supplements',
        severity: 'moderate' as const,
        description: 'Risk of hyperkalemia',
        clinicalEffects: ['Elevated potassium', 'Cardiac arrhythmias'],
        management: 'Monitor serum potassium levels regularly'
      }
    ]
  }
} as const;

// Common medication side effects database
export const SideEffectsDatabase = {
  'metformin': [
    { effect: 'Nausea', severity: 'mild' as const, frequency: 'common' as const },
    { effect: 'Diarrhea', severity: 'mild' as const, frequency: 'common' as const },
    { effect: 'Lactic acidosis', severity: 'severe' as const, frequency: 'rare' as const }
  ],
  'lisinopril': [
    { effect: 'Dry cough', severity: 'mild' as const, frequency: 'common' as const },
    { effect: 'Hyperkalemia', severity: 'moderate' as const, frequency: 'uncommon' as const },
    { effect: 'Angioedema', severity: 'severe' as const, frequency: 'rare' as const }
  ],
  'atorvastatin': [
    { effect: 'Muscle pain', severity: 'mild' as const, frequency: 'common' as const },
    { effect: 'Liver enzyme elevation', severity: 'moderate' as const, frequency: 'uncommon' as const },
    { effect: 'Rhabdomyolysis', severity: 'severe' as const, frequency: 'rare' as const }
  ]
} as const;