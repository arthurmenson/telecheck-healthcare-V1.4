import { z } from 'zod';

export const LabTestResultSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  testType: z.enum([
    'blood_chemistry',
    'complete_blood_count',
    'lipid_panel',
    'liver_function',
    'kidney_function',
    'thyroid_function',
    'diabetes_panel',
    'cardiac_markers',
    'urinalysis',
    'microbiology'
  ]),
  testCode: z.string().min(1),
  testName: z.string().min(1),
  results: z.array(z.object({
    parameter: z.string(),
    value: z.union([z.string(), z.number()]),
    unit: z.string(),
    referenceRange: z.string(),
    status: z.enum(['normal', 'high', 'low', 'critical_high', 'critical_low', 'abnormal']),
    flags: z.array(z.string()).optional()
  })),
  interpretation: z.string().optional(),
  aiAnalysis: z.object({
    riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
    findings: z.array(z.string()),
    recommendations: z.array(z.string()),
    followUpRequired: z.boolean(),
    confidence: z.number().min(0).max(1)
  }).optional(),
  orderedBy: z.string(),
  performedBy: z.string().optional(),
  orderedDate: z.string().datetime(),
  collectedDate: z.string().datetime().optional(),
  resultDate: z.string().datetime().optional(),
  status: z.enum(['ordered', 'collected', 'processing', 'completed', 'cancelled']),
  priority: z.enum(['routine', 'urgent', 'stat']).default('routine'),
  fhirCompliant: z.object({
    resourceType: z.literal('DiagnosticReport'),
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

export type LabTestResult = z.infer<typeof LabTestResultSchema>;

export const CreateLabTestResultSchema = LabTestResultSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type CreateLabTestResult = z.infer<typeof CreateLabTestResultSchema>;

export const UpdateLabTestResultSchema = CreateLabTestResultSchema.partial();

export type UpdateLabTestResult = z.infer<typeof UpdateLabTestResultSchema>;

// Lab Test Templates for common panels
export const LabTestTemplates = {
  complete_blood_count: {
    testCode: 'CBC',
    testName: 'Complete Blood Count',
    parameters: [
      { parameter: 'WBC', unit: 'K/uL', referenceRange: '4.5-11.0' },
      { parameter: 'RBC', unit: 'M/uL', referenceRange: '4.2-5.4' },
      { parameter: 'Hemoglobin', unit: 'g/dL', referenceRange: '12.0-15.5' },
      { parameter: 'Hematocrit', unit: '%', referenceRange: '36-46' },
      { parameter: 'Platelets', unit: 'K/uL', referenceRange: '150-450' }
    ]
  },
  lipid_panel: {
    testCode: 'LIPID',
    testName: 'Lipid Panel',
    parameters: [
      { parameter: 'Total Cholesterol', unit: 'mg/dL', referenceRange: '<200' },
      { parameter: 'LDL Cholesterol', unit: 'mg/dL', referenceRange: '<100' },
      { parameter: 'HDL Cholesterol', unit: 'mg/dL', referenceRange: '>40' },
      { parameter: 'Triglycerides', unit: 'mg/dL', referenceRange: '<150' }
    ]
  }
} as const;