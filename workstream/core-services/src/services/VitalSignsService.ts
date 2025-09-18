import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { VitalSigns, CreateVitalSigns, UpdateVitalSigns } from '../types/VitalSigns';
import { CreateVitalSignsSchema, VitalSignsNormalRanges } from '../types/VitalSigns';
import type { ServiceResult } from '../types/ServiceResult';

interface VitalSignsAlert {
  type: 'critical' | 'high' | 'low' | 'abnormal';
  parameter: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface VitalSignsTrends {
  bloodPressure?: 'improving' | 'stable' | 'deteriorating';
  heartRate?: 'improving' | 'stable' | 'deteriorating';
  temperature?: 'improving' | 'stable' | 'deteriorating';
  overall?: 'improving' | 'stable' | 'deteriorating';
}

export class VitalSignsService {
  private vitalSignsRecords: Map<string, VitalSigns> = new Map();
  private patientVitalSignsIndex: Map<string, string[]> = new Map();

  async recordVitalSigns(data: CreateVitalSigns): Promise<ServiceResult<VitalSigns>> {
    try {
      const validatedData = CreateVitalSignsSchema.parse(data);

      // Calculate BMI if height and weight are provided
      let bmi: VitalSigns['bmi'] | undefined;
      if (validatedData.height && validatedData.weight) {
        bmi = this.calculateBMI(validatedData.height, validatedData.weight);
      }

      // Generate alerts based on vital signs values
      const alerts = await this.generateAlerts(validatedData);

      // Determine clinical significance
      const clinicalSignificance = this.assessClinicalSignificance(alerts);

      // Get trends by comparing with recent measurements
      const trends = await this.calculateTrendsForNewMeasurement(
        validatedData.patientId,
        validatedData
      );

      const vitalSigns: VitalSigns = {
        ...validatedData,
        id: uuidv4(),
        bmi,
        alerts,
        trends,
        clinicalSignificance,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.vitalSignsRecords.set(vitalSigns.id, vitalSigns);

      // Update patient index
      const patientRecords = this.patientVitalSignsIndex.get(vitalSigns.patientId) || [];
      patientRecords.push(vitalSigns.id);
      this.patientVitalSignsIndex.set(vitalSigns.patientId, patientRecords);

      return { success: true, data: vitalSigns };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid vital signs data',
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

  async getVitalSigns(id: string): Promise<ServiceResult<VitalSigns>> {
    const vitalSigns = this.vitalSignsRecords.get(id);

    if (!vitalSigns) {
      return {
        success: false,
        error: {
          code: 'VITAL_SIGNS_NOT_FOUND',
          message: `Vital signs record with ID ${id} not found`
        }
      };
    }

    return { success: true, data: vitalSigns };
  }

  async getPatientVitalSigns(
    patientId: string,
    limit: number = 50
  ): Promise<ServiceResult<VitalSigns[]>> {
    const recordIds = this.patientVitalSignsIndex.get(patientId) || [];
    const vitalSignsRecords = recordIds
      .map(id => this.vitalSignsRecords.get(id))
      .filter((vs): vs is VitalSigns => vs !== undefined)
      .sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime())
      .slice(0, limit);

    return { success: true, data: vitalSignsRecords };
  }

  async updateVitalSigns(id: string, data: UpdateVitalSigns): Promise<ServiceResult<VitalSigns>> {
    const existingRecord = this.vitalSignsRecords.get(id);

    if (!existingRecord) {
      return {
        success: false,
        error: {
          code: 'VITAL_SIGNS_NOT_FOUND',
          message: `Vital signs record with ID ${id} not found`
        }
      };
    }

    try {
      const updatedData = { ...existingRecord, ...data };

      // Recalculate BMI if height or weight changed
      let bmi = existingRecord.bmi;
      if (data.height || data.weight) {
        const height = data.height || existingRecord.height;
        const weight = data.weight || existingRecord.weight;
        if (height && weight) {
          bmi = this.calculateBMI(height, weight);
        }
      }

      // Regenerate alerts based on updated values
      const alerts = await this.generateAlerts(updatedData);
      const clinicalSignificance = this.assessClinicalSignificance(alerts);

      const updatedVitalSigns: VitalSigns = {
        ...updatedData,
        bmi,
        alerts,
        clinicalSignificance,
        updatedAt: new Date().toISOString()
      };

      this.vitalSignsRecords.set(id, updatedVitalSigns);

      return { success: true, data: updatedVitalSigns };
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

  async analyzeTrends(patientId: string, days: number = 7): Promise<ServiceResult<VitalSignsTrends>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentRecords = await this.getPatientVitalSigns(patientId, 100);
    if (!recentRecords.success) {
      return recentRecords as ServiceResult<VitalSignsTrends>;
    }

    const relevantRecords = recentRecords.data.filter(
      record => new Date(record.measurementDate) >= cutoffDate
    );

    if (relevantRecords.length < 2) {
      return {
        success: true,
        data: { overall: 'stable' }
      };
    }

    const trends: VitalSignsTrends = {};

    // Analyze blood pressure trends
    const bpRecords = relevantRecords.filter(r => r.bloodPressure);
    if (bpRecords.length >= 2) {
      trends.bloodPressure = this.calculateParameterTrend(
        bpRecords.map(r => r.bloodPressure!.systolic)
      );
    }

    // Analyze heart rate trends
    const hrRecords = relevantRecords.filter(r => r.heartRate);
    if (hrRecords.length >= 2) {
      trends.heartRate = this.calculateParameterTrend(
        hrRecords.map(r => r.heartRate!.bpm)
      );
    }

    // Analyze temperature trends
    const tempRecords = relevantRecords.filter(r => r.temperature);
    if (tempRecords.length >= 2) {
      trends.temperature = this.calculateParameterTrend(
        tempRecords.map(r => r.temperature!.value)
      );
    }

    // Calculate overall trend
    const trendValues = Object.values(trends);
    if (trendValues.length > 0) {
      const improvingCount = trendValues.filter(t => t === 'improving').length;
      const deterioratingCount = trendValues.filter(t => t === 'deteriorating').length;

      if (improvingCount > deterioratingCount) {
        trends.overall = 'improving';
      } else if (deterioratingCount > improvingCount) {
        trends.overall = 'deteriorating';
      } else {
        trends.overall = 'stable';
      }
    }

    return { success: true, data: trends };
  }

  async generateAlerts(vitalSigns: Partial<VitalSigns>): Promise<VitalSignsAlert[]> {
    const alerts: VitalSignsAlert[] = [];

    // Blood pressure alerts
    if (vitalSigns.bloodPressure) {
      const { systolic, diastolic } = vitalSigns.bloodPressure;
      const ranges = VitalSignsNormalRanges.bloodPressure;

      if (systolic >= 180 || diastolic >= 110) {
        alerts.push({
          type: 'critical',
          parameter: 'bloodPressure',
          message: `Critical hypertension: ${systolic}/${diastolic} mmHg`,
          severity: 'critical'
        });
      } else if (systolic >= 140 || diastolic >= 90) {
        alerts.push({
          type: 'high',
          parameter: 'bloodPressure',
          message: `Elevated blood pressure: ${systolic}/${diastolic} mmHg`,
          severity: 'high'
        });
      } else if (systolic < 90 || diastolic < 60) {
        alerts.push({
          type: 'low',
          parameter: 'bloodPressure',
          message: `Low blood pressure: ${systolic}/${diastolic} mmHg`,
          severity: 'medium'
        });
      }
    }

    // Heart rate alerts
    if (vitalSigns.heartRate) {
      const { bpm } = vitalSigns.heartRate;
      const ranges = VitalSignsNormalRanges.heartRate;

      if (bpm < 40) {
        alerts.push({
          type: 'critical',
          parameter: 'heartRate',
          message: `Severe bradycardia: ${bpm} BPM`,
          severity: 'critical'
        });
      } else if (bpm < ranges.min) {
        alerts.push({
          type: 'low',
          parameter: 'heartRate',
          message: `Bradycardia: ${bpm} BPM`,
          severity: 'medium'
        });
      } else if (bpm > 150) {
        alerts.push({
          type: 'critical',
          parameter: 'heartRate',
          message: `Severe tachycardia: ${bpm} BPM`,
          severity: 'critical'
        });
      } else if (bpm > ranges.max) {
        alerts.push({
          type: 'high',
          parameter: 'heartRate',
          message: `Tachycardia: ${bpm} BPM`,
          severity: 'high'
        });
      }
    }

    // Temperature alerts
    if (vitalSigns.temperature) {
      const { value, unit } = vitalSigns.temperature;
      const ranges = VitalSignsNormalRanges.temperature[unit];

      if (unit === 'celsius') {
        if (value >= 39.5) {
          alerts.push({
            type: 'critical',
            parameter: 'temperature',
            message: `High fever: ${value}°C`,
            severity: 'critical'
          });
        } else if (value >= ranges.fever.min) {
          alerts.push({
            type: 'high',
            parameter: 'temperature',
            message: `Fever: ${value}°C`,
            severity: 'medium'
          });
        } else if (value <= ranges.hypothermia.max) {
          alerts.push({
            type: 'low',
            parameter: 'temperature',
            message: `Hypothermia: ${value}°C`,
            severity: 'high'
          });
        }
      }
    }

    // Oxygen saturation alerts
    if (vitalSigns.oxygenSaturation) {
      const { percentage } = vitalSigns.oxygenSaturation;
      const ranges = VitalSignsNormalRanges.oxygenSaturation;

      if (percentage <= ranges.critical.max) {
        alerts.push({
          type: 'critical',
          parameter: 'oxygenSaturation',
          message: `Critical hypoxemia: ${percentage}%`,
          severity: 'critical'
        });
      } else if (percentage < ranges.min) {
        alerts.push({
          type: 'low',
          parameter: 'oxygenSaturation',
          message: `Low oxygen saturation: ${percentage}%`,
          severity: 'high'
        });
      }
    }

    // Pain level alerts
    if (vitalSigns.painLevel) {
      const { score } = vitalSigns.painLevel;
      const ranges = VitalSignsNormalRanges.painLevel;

      if (score >= ranges.severe.min) {
        alerts.push({
          type: 'high',
          parameter: 'painLevel',
          message: `Severe pain reported: ${score}/10`,
          severity: 'high'
        });
      } else if (score >= ranges.moderate.min) {
        alerts.push({
          type: 'abnormal',
          parameter: 'painLevel',
          message: `Moderate pain reported: ${score}/10`,
          severity: 'medium'
        });
      }
    }

    return alerts;
  }

  private calculateBMI(
    height: VitalSigns['height'],
    weight: VitalSigns['weight']
  ): VitalSigns['bmi'] {
    if (!height || !weight) return undefined;

    // Convert to metric units
    let heightInMeters = height.value;
    if (height.unit === 'cm') {
      heightInMeters = height.value / 100;
    } else if (height.unit === 'inches') {
      heightInMeters = height.value * 0.0254;
    } else if (height.unit === 'feet') {
      heightInMeters = height.value * 0.3048;
    }

    let weightInKg = weight.value;
    if (weight.unit === 'lbs') {
      weightInKg = weight.value * 0.453592;
    }

    const bmi = weightInKg / (heightInMeters * heightInMeters);

    // Determine BMI category
    let category: VitalSigns['bmi']['category'];
    if (bmi < 18.5) {
      category = 'underweight';
    } else if (bmi < 25) {
      category = 'normal';
    } else if (bmi < 30) {
      category = 'overweight';
    } else if (bmi < 35) {
      category = 'obese_class_1';
    } else if (bmi < 40) {
      category = 'obese_class_2';
    } else {
      category = 'obese_class_3';
    }

    return {
      value: Math.round(bmi * 100) / 100,
      category
    };
  }

  private assessClinicalSignificance(alerts: VitalSignsAlert[]): VitalSigns['clinicalSignificance'] {
    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
    const highSeverityAlerts = alerts.filter(alert => alert.severity === 'high');

    return {
      normalForPatient: alerts.length === 0,
      actionRequired: criticalAlerts.length > 0 || highSeverityAlerts.length > 1,
      physicianNotified: criticalAlerts.length > 0,
      interventions: criticalAlerts.length > 0 ? ['Immediate medical evaluation required'] : undefined
    };
  }

  private async calculateTrendsForNewMeasurement(
    patientId: string,
    newData: CreateVitalSigns
  ): Promise<VitalSignsTrends | undefined> {
    const recentRecords = await this.getPatientVitalSigns(patientId, 5);
    if (!recentRecords.success || recentRecords.data.length < 2) {
      return undefined;
    }

    // Simple trend calculation based on most recent measurements
    const trends: VitalSignsTrends = {};

    if (newData.bloodPressure && recentRecords.data[0]?.bloodPressure) {
      const currentSystolic = newData.bloodPressure.systolic;
      const previousSystolic = recentRecords.data[0].bloodPressure.systolic;

      if (currentSystolic < previousSystolic - 5) {
        trends.bloodPressure = 'improving';
      } else if (currentSystolic > previousSystolic + 5) {
        trends.bloodPressure = 'deteriorating';
      } else {
        trends.bloodPressure = 'stable';
      }
    }

    return trends;
  }

  private calculateParameterTrend(values: number[]): 'improving' | 'stable' | 'deteriorating' {
    if (values.length < 2) return 'stable';

    // Simple linear trend analysis
    const first = values[values.length - 1]; // Oldest
    const last = values[0]; // Most recent

    const change = ((last - first) / first) * 100;

    if (change > 5) {
      return 'deteriorating'; // Generally, increasing vital signs indicate deterioration
    } else if (change < -5) {
      return 'improving';
    }
    return 'stable';
  }

  async deleteVitalSigns(id: string): Promise<ServiceResult<boolean>> {
    const vitalSigns = this.vitalSignsRecords.get(id);

    if (!vitalSigns) {
      return {
        success: false,
        error: {
          code: 'VITAL_SIGNS_NOT_FOUND',
          message: `Vital signs record with ID ${id} not found`
        }
      };
    }

    this.vitalSignsRecords.delete(id);

    // Update patient index
    const patientRecords = this.patientVitalSignsIndex.get(vitalSigns.patientId) || [];
    const updatedRecords = patientRecords.filter(recordId => recordId !== id);
    this.patientVitalSignsIndex.set(vitalSigns.patientId, updatedRecords);

    return { success: true, data: true };
  }

  async listVitalSigns(): Promise<ServiceResult<VitalSigns[]>> {
    const records = Array.from(this.vitalSignsRecords.values())
      .sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime());

    return { success: true, data: records };
  }
}