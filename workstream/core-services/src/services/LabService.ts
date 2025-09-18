import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { LabTestResult, CreateLabTestResult, UpdateLabTestResult } from '../types/Laboratory';
import { CreateLabTestResultSchema } from '../types/Laboratory';
import type { ServiceResult } from '../types/ServiceResult';

interface AIAnalysis {
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  findings: string[];
  recommendations: string[];
  followUpRequired: boolean;
  confidence: number;
}

interface LabResultParameter {
  parameter: string;
  value: string | number;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low' | 'critical_high' | 'critical_low' | 'abnormal';
  flags?: string[];
}

export class LabService {
  private labResults: Map<string, LabTestResult> = new Map();
  private patientLabIndex: Map<string, string[]> = new Map();

  async createLabResult(data: CreateLabTestResult): Promise<ServiceResult<LabTestResult>> {
    try {
      const validatedData = CreateLabTestResultSchema.parse(data);

      // Generate AI analysis if there are abnormal results
      let aiAnalysis: AIAnalysis | undefined;
      const hasAbnormalResults = validatedData.results.some(r => r.status !== 'normal');

      if (hasAbnormalResults) {
        aiAnalysis = await this.generateAIAnalysis(validatedData.results);
      }

      const labResult: LabTestResult = {
        ...validatedData,
        id: uuidv4(),
        aiAnalysis,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.labResults.set(labResult.id, labResult);

      // Update patient index
      const patientLabResults = this.patientLabIndex.get(labResult.patientId) || [];
      patientLabResults.push(labResult.id);
      this.patientLabIndex.set(labResult.patientId, patientLabResults);

      return { success: true, data: labResult };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid lab result data',
            details: { issues: error.issues }
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      };
    }
  }

  async getLabResult(id: string): Promise<ServiceResult<LabTestResult>> {
    const labResult = this.labResults.get(id);

    if (!labResult) {
      return {
        success: false,
        error: {
          code: 'LAB_RESULT_NOT_FOUND',
          message: `Lab result with ID ${id} not found`
        }
      };
    }

    return { success: true, data: labResult };
  }

  async getPatientLabResults(patientId: string): Promise<ServiceResult<LabTestResult[]>> {
    const labResultIds = this.patientLabIndex.get(patientId) || [];
    const labResults = labResultIds
      .map(id => this.labResults.get(id))
      .filter((lab): lab is LabTestResult => lab !== undefined);

    return { success: true, data: labResults };
  }

  async updateLabResult(id: string, data: UpdateLabTestResult): Promise<ServiceResult<LabTestResult>> {
    const existingResult = this.labResults.get(id);

    if (!existingResult) {
      return {
        success: false,
        error: {
          code: 'LAB_RESULT_NOT_FOUND',
          message: `Lab result with ID ${id} not found`
        }
      };
    }

    try {
      const updatedResult: LabTestResult = {
        ...existingResult,
        ...data,
        updatedAt: new Date().toISOString()
      };

      this.labResults.set(id, updatedResult);

      return { success: true, data: updatedResult };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      };
    }
  }

  async generateAIAnalysis(results: LabResultParameter[]): Promise<AIAnalysis> {
    // Simplified AI analysis logic for demonstration
    const abnormalResults = results.filter(r => r.status !== 'normal');
    const criticalResults = results.filter(r =>
      r.status === 'critical_high' || r.status === 'critical_low'
    );

    let riskLevel: AIAnalysis['riskLevel'] = 'low';
    const findings: string[] = [];
    const recommendations: string[] = [];

    if (criticalResults.length > 0) {
      riskLevel = 'critical';
      criticalResults.forEach(result => {
        if (result.parameter === 'WBC' && result.status === 'critical_high') {
          findings.push('Critically elevated white blood cell count');
          recommendations.push('Immediate medical evaluation required');
          recommendations.push('Consider infection workup or hematologic evaluation');
        }
      });
    } else if (abnormalResults.length > 0) {
      // Check for specific patterns
      const cholesterolIssues = abnormalResults.filter(r =>
        r.parameter.includes('Cholesterol') && r.status === 'high'
      );

      if (cholesterolIssues.length > 0) {
        riskLevel = 'moderate';
        findings.push('Elevated cholesterol levels detected');
        recommendations.push('Consider dietary modifications');
        recommendations.push('Follow up with cardiology if indicated');
      }
    } else {
      findings.push('All parameters within normal limits');
      recommendations.push('Continue routine monitoring');
    }

    return {
      riskLevel,
      findings,
      recommendations,
      followUpRequired: riskLevel !== 'low',
      confidence: criticalResults.length > 0 ? 0.95 : 0.85
    };
  }

  async deleteLabResult(id: string): Promise<ServiceResult<boolean>> {
    const labResult = this.labResults.get(id);

    if (!labResult) {
      return {
        success: false,
        error: {
          code: 'LAB_RESULT_NOT_FOUND',
          message: `Lab result with ID ${id} not found`
        }
      };
    }

    this.labResults.delete(id);

    // Update patient index
    const patientLabResults = this.patientLabIndex.get(labResult.patientId) || [];
    const updatedResults = patientLabResults.filter(labId => labId !== id);
    this.patientLabIndex.set(labResult.patientId, updatedResults);

    return { success: true, data: true };
  }

  async listLabResults(): Promise<ServiceResult<LabTestResult[]>> {
    const results = Array.from(this.labResults.values());
    return { success: true, data: results };
  }
}