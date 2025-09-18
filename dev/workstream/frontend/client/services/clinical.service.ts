import { apiClient } from '../lib/api-client';
import { EHR } from '../lib/api-endpoints';

// Shared clinical data types
export interface Patient {
  id: string;
  identifier: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  type: 'in-person' | 'telehealth' | 'phone' | 'follow-up';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  startTime: string;
  endTime: string;
  reason: string;
  notes?: string;
  patient?: Patient;
  provider?: {
    id: string;
    name: string;
    role: string;
    specialty?: string;
  };
  urgent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VitalSigns {
  id: string;
  patientId: string;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
  measuredAt: string;
  measuredBy: string;
  createdAt: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  prescribedBy: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  instructions?: string;
  sideEffects?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LabResult {
  id: string;
  patientId: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical' | 'pending';
  collectedAt: string;
  resultedAt: string;
  orderedBy: string;
  category: string;
  createdAt: string;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  appointmentId?: string;
  type: 'progress' | 'assessment' | 'plan' | 'consultation' | 'discharge';
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  medicationId: string;
  prescribedBy: string;
  dosage: string;
  quantity: number;
  refills: number;
  status: 'active' | 'filled' | 'cancelled' | 'expired';
  instructions: string;
  prescribedAt: string;
  filledAt?: string;
  pharmacy?: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
}

export interface ClinicalAlert {
  id: string;
  patientId: string;
  type: 'allergy' | 'drug-interaction' | 'critical-value' | 'follow-up' | 'vital-signs';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface DashboardMetrics {
  totalPatients: number;
  todayAppointments: number;
  completedAppointments: number;
  pendingTasks: number;
  criticalAlerts: number;
  newMessages: number;
  activePatients: number;
  avgResponseTime: number;
}

class ClinicalService {
  // Patient Management
  async getPatients(params?: {
    page?: number;
    limit?: number;
    search?: string;
    assignedTo?: string;
  }): Promise<{ patients: Patient[]; total: number; pages: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.assignedTo) searchParams.append('assignedTo', params.assignedTo);

    const response = await apiClient.get<{ patients: Patient[]; total: number; pages: number }>(
      `/patients?${searchParams.toString()}`
    );
    return response.data;
  }

  async getPatient(patientId: string): Promise<Patient> {
    const response = await apiClient.get<Patient>(`/patients/${patientId}`);
    return response.data;
  }

  async createPatient(patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> {
    const response = await apiClient.post<Patient>('/patients', patientData);
    return response.data;
  }

  async updatePatient(patientId: string, patientData: Partial<Patient>): Promise<Patient> {
    const response = await apiClient.put<Patient>(`/patients/${patientId}`, patientData);
    return response.data;
  }

  // Appointments
  async getAppointments(params?: {
    page?: number;
    limit?: number;
    date?: string;
    providerId?: string;
    patientId?: string;
    status?: string;
  }): Promise<{ appointments: Appointment[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.date) searchParams.append('date', params.date);
    if (params?.providerId) searchParams.append('providerId', params.providerId);
    if (params?.patientId) searchParams.append('patientId', params.patientId);
    if (params?.status) searchParams.append('status', params.status);

    const response = await apiClient.get<{ appointments: Appointment[]; total: number }>(
      `${EHR.SCHEDULING.APPOINTMENTS}?${searchParams.toString()}`
    );
    return response.data;
  }

  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> {
    const response = await apiClient.post<Appointment>(EHR.SCHEDULING.APPOINTMENTS, appointmentData);
    return response.data;
  }

  async updateAppointment(appointmentId: string, data: Partial<Appointment>): Promise<Appointment> {
    const response = await apiClient.put<Appointment>(`${EHR.SCHEDULING.APPOINTMENTS}/${appointmentId}`, data);
    return response.data;
  }

  async cancelAppointment(appointmentId: string, reason?: string): Promise<void> {
    await apiClient.post(EHR.SCHEDULING.CANCEL(appointmentId), { reason });
  }

  // Vital Signs
  async getVitalSigns(patientId: string, params?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<VitalSigns[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);

    const response = await apiClient.get<VitalSigns[]>(
      `/patients/${patientId}/vitals?${searchParams.toString()}`
    );
    return response.data;
  }

  async addVitalSigns(patientId: string, vitals: Omit<VitalSigns, 'id' | 'patientId' | 'createdAt'>): Promise<VitalSigns> {
    const response = await apiClient.post<VitalSigns>(`/patients/${patientId}/vitals`, vitals);
    return response.data;
  }

  // Medications
  async getMedications(patientId: string): Promise<Medication[]> {
    const response = await apiClient.get<Medication[]>(`/patients/${patientId}/medications`);
    return response.data;
  }

  async addMedication(patientId: string, medication: Omit<Medication, 'id' | 'patientId' | 'createdAt' | 'updatedAt'>): Promise<Medication> {
    const response = await apiClient.post<Medication>(`/patients/${patientId}/medications`, medication);
    return response.data;
  }

  async updateMedication(medicationId: string, data: Partial<Medication>): Promise<Medication> {
    const response = await apiClient.put<Medication>(`/medications/${medicationId}`, data);
    return response.data;
  }

  // Lab Results
  async getLabResults(patientId: string, params?: {
    limit?: number;
    category?: string;
    status?: string;
  }): Promise<LabResult[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.category) searchParams.append('category', params.category);
    if (params?.status) searchParams.append('status', params.status);

    const response = await apiClient.get<LabResult[]>(
      `/patients/${patientId}/lab-results?${searchParams.toString()}`
    );
    return response.data;
  }

  async orderLabTest(patientId: string, testData: {
    testName: string;
    category: string;
    urgency: 'routine' | 'urgent' | 'stat';
    instructions?: string;
  }): Promise<{ orderId: string }> {
    const response = await apiClient.post<{ orderId: string }>(`/patients/${patientId}/lab-orders`, testData);
    return response.data;
  }

  // Clinical Notes
  async getClinicalNotes(patientId: string, params?: {
    limit?: number;
    type?: string;
  }): Promise<ClinicalNote[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.type) searchParams.append('type', params.type);

    const response = await apiClient.get<ClinicalNote[]>(
      `/patients/${patientId}/notes?${searchParams.toString()}`
    );
    return response.data;
  }

  async createClinicalNote(patientId: string, note: Omit<ClinicalNote, 'id' | 'patientId' | 'createdAt' | 'updatedAt'>): Promise<ClinicalNote> {
    const response = await apiClient.post<ClinicalNote>(`/patients/${patientId}/notes`, note);
    return response.data;
  }

  // Prescriptions
  async getPrescriptions(params?: {
    patientId?: string;
    prescribedBy?: string;
    status?: string;
    limit?: number;
  }): Promise<Prescription[]> {
    const searchParams = new URLSearchParams();
    if (params?.patientId) searchParams.append('patientId', params.patientId);
    if (params?.prescribedBy) searchParams.append('prescribedBy', params.prescribedBy);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get<Prescription[]>(`/prescriptions?${searchParams.toString()}`);
    return response.data;
  }

  async createPrescription(prescription: Omit<Prescription, 'id' | 'prescribedAt' | 'filledAt'>): Promise<Prescription> {
    const response = await apiClient.post<Prescription>('/prescriptions', prescription);
    return response.data;
  }

  async updatePrescriptionStatus(prescriptionId: string, status: Prescription['status']): Promise<Prescription> {
    const response = await apiClient.patch<Prescription>(`/prescriptions/${prescriptionId}/status`, { status });
    return response.data;
  }

  // Clinical Alerts
  async getClinicalAlerts(params?: {
    patientId?: string;
    type?: string;
    severity?: string;
    status?: string;
    limit?: number;
  }): Promise<ClinicalAlert[]> {
    const searchParams = new URLSearchParams();
    if (params?.patientId) searchParams.append('patientId', params.patientId);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.severity) searchParams.append('severity', params.severity);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get<ClinicalAlert[]>(`/clinical-alerts?${searchParams.toString()}`);
    return response.data;
  }

  async acknowledgeAlert(alertId: string): Promise<ClinicalAlert> {
    const response = await apiClient.post<ClinicalAlert>(`/clinical-alerts/${alertId}/acknowledge`);
    return response.data;
  }

  async resolveAlert(alertId: string, notes?: string): Promise<ClinicalAlert> {
    const response = await apiClient.post<ClinicalAlert>(`/clinical-alerts/${alertId}/resolve`, { notes });
    return response.data;
  }

  // Dashboard Metrics
  async getDashboardMetrics(providerId?: string): Promise<DashboardMetrics> {
    const searchParams = new URLSearchParams();
    if (providerId) searchParams.append('providerId', providerId);

    const response = await apiClient.get<DashboardMetrics>(`/dashboard/metrics?${searchParams.toString()}`);
    return response.data;
  }

  async getProviderSchedule(providerId: string, date?: string): Promise<Appointment[]> {
    const searchParams = new URLSearchParams();
    if (date) searchParams.append('date', date);

    const response = await apiClient.get<Appointment[]>(`/providers/${providerId}/schedule?${searchParams.toString()}`);
    return response.data;
  }

  async getPatientSummary(patientId: string): Promise<{
    patient: Patient;
    recentVitals: VitalSigns[];
    activeMedications: Medication[];
    recentLabResults: LabResult[];
    upcomingAppointments: Appointment[];
    alerts: ClinicalAlert[];
  }> {
    const response = await apiClient.get(`/patients/${patientId}/summary`);
    return response.data;
  }

  // Search functionality
  async searchPatients(query: string, limit: number = 10): Promise<Patient[]> {
    const response = await apiClient.get<Patient[]>(`/patients/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  }

  async searchMedications(query: string, limit: number = 10): Promise<Array<{
    id: string;
    name: string;
    genericName?: string;
    strength?: string;
    form?: string;
  }>> {
    const response = await apiClient.get(`/medications/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  }
}

export const clinicalService = new ClinicalService();
export default clinicalService;