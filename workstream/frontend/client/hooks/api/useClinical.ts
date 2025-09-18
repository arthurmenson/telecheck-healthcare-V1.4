import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  clinicalService,
  Patient,
  Appointment,
  VitalSigns,
  Medication,
  LabResult,
  ClinicalNote,
  Prescription,
  ClinicalAlert
} from '../../services/clinical.service';
import { toast } from '../../hooks/use-toast';

// Query Keys
export const CLINICAL_QUERY_KEYS = {
  PATIENTS: ['clinical', 'patients'],
  PATIENT: (id: string) => ['clinical', 'patient', id],
  PATIENT_SUMMARY: (id: string) => ['clinical', 'patient', id, 'summary'],
  APPOINTMENTS: ['clinical', 'appointments'],
  PROVIDER_SCHEDULE: (id: string, date?: string) => ['clinical', 'provider', id, 'schedule', date],
  VITAL_SIGNS: (patientId: string) => ['clinical', 'vitals', patientId],
  MEDICATIONS: (patientId: string) => ['clinical', 'medications', patientId],
  LAB_RESULTS: (patientId: string) => ['clinical', 'lab-results', patientId],
  CLINICAL_NOTES: (patientId: string) => ['clinical', 'notes', patientId],
  PRESCRIPTIONS: ['clinical', 'prescriptions'],
  CLINICAL_ALERTS: ['clinical', 'alerts'],
  DASHBOARD_METRICS: (providerId?: string) => ['clinical', 'dashboard', 'metrics', providerId],
} as const;

// Patient Hooks
export const usePatients = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  assignedTo?: string;
}) => {
  return useQuery({
    queryKey: [...CLINICAL_QUERY_KEYS.PATIENTS, params],
    queryFn: () => clinicalService.getPatients(params),
    staleTime: 30000,
  });
};

export const usePatient = (patientId: string) => {
  return useQuery({
    queryKey: CLINICAL_QUERY_KEYS.PATIENT(patientId),
    queryFn: () => clinicalService.getPatient(patientId),
    enabled: !!patientId,
    staleTime: 60000,
  });
};

export const usePatientSummary = (patientId: string) => {
  return useQuery({
    queryKey: CLINICAL_QUERY_KEYS.PATIENT_SUMMARY(patientId),
    queryFn: () => clinicalService.getPatientSummary(patientId),
    enabled: !!patientId,
    staleTime: 30000,
  });
};

export const useSearchPatients = (query: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['clinical', 'patients', 'search', query],
    queryFn: () => clinicalService.searchPatients(query),
    enabled: enabled && query.length > 2,
    staleTime: 60000,
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) =>
      clinicalService.createPatient(patientData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.PATIENTS });
      toast({
        title: "Success",
        description: "Patient created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create patient",
        variant: "destructive",
      });
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, data }: { patientId: string; data: Partial<Patient> }) =>
      clinicalService.updatePatient(patientId, data),
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.PATIENTS });
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.PATIENT(patientId) });
      toast({
        title: "Success",
        description: "Patient updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update patient",
        variant: "destructive",
      });
    },
  });
};

// Appointment Hooks
export const useAppointments = (params?: {
  page?: number;
  limit?: number;
  date?: string;
  providerId?: string;
  patientId?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: [...CLINICAL_QUERY_KEYS.APPOINTMENTS, params],
    queryFn: () => clinicalService.getAppointments(params),
    staleTime: 30000,
  });
};

export const useProviderSchedule = (providerId: string, date?: string) => {
  return useQuery({
    queryKey: CLINICAL_QUERY_KEYS.PROVIDER_SCHEDULE(providerId, date),
    queryFn: () => clinicalService.getProviderSchedule(providerId, date),
    enabled: !!providerId,
    staleTime: 30000,
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) =>
      clinicalService.createAppointment(appointmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.APPOINTMENTS });
      toast({
        title: "Success",
        description: "Appointment scheduled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule appointment",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, data }: { appointmentId: string; data: Partial<Appointment> }) =>
      clinicalService.updateAppointment(appointmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.APPOINTMENTS });
      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update appointment",
        variant: "destructive",
      });
    },
  });
};

export const useCancelAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason?: string }) =>
      clinicalService.cancelAppointment(appointmentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.APPOINTMENTS });
      toast({
        title: "Success",
        description: "Appointment cancelled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    },
  });
};

// Vital Signs Hooks
export const useVitalSigns = (patientId: string, params?: {
  limit?: number;
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: [...CLINICAL_QUERY_KEYS.VITAL_SIGNS(patientId), params],
    queryFn: () => clinicalService.getVitalSigns(patientId, params),
    enabled: !!patientId,
    staleTime: 30000,
  });
};

export const useAddVitalSigns = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, vitals }: {
      patientId: string;
      vitals: Omit<VitalSigns, 'id' | 'patientId' | 'createdAt'>
    }) =>
      clinicalService.addVitalSigns(patientId, vitals),
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.VITAL_SIGNS(patientId) });
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.PATIENT_SUMMARY(patientId) });
      toast({
        title: "Success",
        description: "Vital signs recorded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record vital signs",
        variant: "destructive",
      });
    },
  });
};

// Medication Hooks
export const useMedications = (patientId: string) => {
  return useQuery({
    queryKey: CLINICAL_QUERY_KEYS.MEDICATIONS(patientId),
    queryFn: () => clinicalService.getMedications(patientId),
    enabled: !!patientId,
    staleTime: 60000,
  });
};

export const useAddMedication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, medication }: {
      patientId: string;
      medication: Omit<Medication, 'id' | 'patientId' | 'createdAt' | 'updatedAt'>
    }) =>
      clinicalService.addMedication(patientId, medication),
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.MEDICATIONS(patientId) });
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.PATIENT_SUMMARY(patientId) });
      toast({
        title: "Success",
        description: "Medication added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add medication",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateMedication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ medicationId, data }: { medicationId: string; data: Partial<Medication> }) =>
      clinicalService.updateMedication(medicationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.MEDICATIONS });
      toast({
        title: "Success",
        description: "Medication updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update medication",
        variant: "destructive",
      });
    },
  });
};

// Lab Results Hooks
export const useLabResults = (patientId: string, params?: {
  limit?: number;
  category?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: [...CLINICAL_QUERY_KEYS.LAB_RESULTS(patientId), params],
    queryFn: () => clinicalService.getLabResults(patientId, params),
    enabled: !!patientId,
    staleTime: 60000,
  });
};

export const useOrderLabTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, testData }: {
      patientId: string;
      testData: {
        testName: string;
        category: string;
        urgency: 'routine' | 'urgent' | 'stat';
        instructions?: string;
      }
    }) =>
      clinicalService.orderLabTest(patientId, testData),
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.LAB_RESULTS(patientId) });
      toast({
        title: "Success",
        description: "Lab test ordered successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to order lab test",
        variant: "destructive",
      });
    },
  });
};

// Clinical Notes Hooks
export const useClinicalNotes = (patientId: string, params?: {
  limit?: number;
  type?: string;
}) => {
  return useQuery({
    queryKey: [...CLINICAL_QUERY_KEYS.CLINICAL_NOTES(patientId), params],
    queryFn: () => clinicalService.getClinicalNotes(patientId, params),
    enabled: !!patientId,
    staleTime: 60000,
  });
};

export const useCreateClinicalNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, note }: {
      patientId: string;
      note: Omit<ClinicalNote, 'id' | 'patientId' | 'createdAt' | 'updatedAt'>
    }) =>
      clinicalService.createClinicalNote(patientId, note),
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.CLINICAL_NOTES(patientId) });
      toast({
        title: "Success",
        description: "Clinical note saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save clinical note",
        variant: "destructive",
      });
    },
  });
};

// Prescription Hooks
export const usePrescriptions = (params?: {
  patientId?: string;
  prescribedBy?: string;
  status?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: [...CLINICAL_QUERY_KEYS.PRESCRIPTIONS, params],
    queryFn: () => clinicalService.getPrescriptions(params),
    staleTime: 60000,
  });
};

export const useCreatePrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prescription: Omit<Prescription, 'id' | 'prescribedAt' | 'filledAt'>) =>
      clinicalService.createPrescription(prescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.PRESCRIPTIONS });
      toast({
        title: "Success",
        description: "Prescription created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create prescription",
        variant: "destructive",
      });
    },
  });
};

export const useUpdatePrescriptionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prescriptionId, status }: { prescriptionId: string; status: Prescription['status'] }) =>
      clinicalService.updatePrescriptionStatus(prescriptionId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.PRESCRIPTIONS });
      toast({
        title: "Success",
        description: "Prescription status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update prescription status",
        variant: "destructive",
      });
    },
  });
};

// Clinical Alerts Hooks
export const useClinicalAlerts = (params?: {
  patientId?: string;
  type?: string;
  severity?: string;
  status?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: [...CLINICAL_QUERY_KEYS.CLINICAL_ALERTS, params],
    queryFn: () => clinicalService.getClinicalAlerts(params),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });
};

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => clinicalService.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.CLINICAL_ALERTS });
      toast({
        title: "Success",
        description: "Alert acknowledged",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to acknowledge alert",
        variant: "destructive",
      });
    },
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, notes }: { alertId: string; notes?: string }) =>
      clinicalService.resolveAlert(alertId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLINICAL_QUERY_KEYS.CLINICAL_ALERTS });
      toast({
        title: "Success",
        description: "Alert resolved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve alert",
        variant: "destructive",
      });
    },
  });
};

// Dashboard Hooks
export const useDashboardMetrics = (providerId?: string) => {
  return useQuery({
    queryKey: CLINICAL_QUERY_KEYS.DASHBOARD_METRICS(providerId),
    queryFn: () => clinicalService.getDashboardMetrics(providerId),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });
};

// Search Hooks
export const useSearchMedications = (query: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['clinical', 'medications', 'search', query],
    queryFn: () => clinicalService.searchMedications(query),
    enabled: enabled && query.length > 2,
    staleTime: 300000, // 5 minutes for medication search
  });
};