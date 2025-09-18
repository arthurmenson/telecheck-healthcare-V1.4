import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as Voice from '@react-native-voice/voice';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ClinicalNote,
  Patient,
  Appointment,
  VitalSigns,
  Medication,
  HealthMetrics
} from '@/types/healthcare';
import { User } from '@/types/auth';
import { useAuth } from '@/services/auth/AuthProvider';
import { useSecurity } from '@/services/security/SecurityProvider';
import { useAnalytics } from '@/services/analytics/AnalyticsProvider';
import { apiService } from '@/services/api/apiService';

interface WorkflowStep {
  id: string;
  name: string;
  type: 'data_entry' | 'review' | 'approval' | 'documentation' | 'billing';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  estimatedTime: number; // minutes
  actualTime?: number;
  isRequired: boolean;
  dependencies: string[];
  aiAssisted: boolean;
  voiceEnabled: boolean;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  type: 'patient_visit' | 'telemedicine' | 'follow_up' | 'procedure' | 'documentation';
  steps: WorkflowStep[];
  averageTime: number;
  efficiency: number; // 0-100
  patientSatisfaction: number; // 0-100
  providerSatisfaction: number; // 0-100
}

interface ActiveWorkflow {
  id: string;
  templateId: string;
  patientId: string;
  providerId: string;
  appointmentId?: string;
  currentStep: number;
  steps: WorkflowStep[];
  startTime: string;
  estimatedEndTime: string;
  actualEndTime?: string;
  interruptions: WorkflowInterruption[];
  context: WorkflowContext;
  aiRecommendations: AIRecommendation[];
}

interface WorkflowInterruption {
  id: string;
  type: 'emergency' | 'urgent_call' | 'technical_issue' | 'patient_request';
  description: string;
  startTime: string;
  endTime?: string;
  impact: number; // minutes lost
}

interface WorkflowContext {
  patient: Patient;
  appointment?: Appointment;
  previousNotes: ClinicalNote[];
  currentMedications: Medication[];
  recentVitals: VitalSigns[];
  healthTrends: HealthMetrics[];
  alerts: ClinicalAlert[];
}

interface ClinicalAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  priority: number;
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
  actionRequired: boolean;
  relatedData?: any;
}

interface AIRecommendation {
  id: string;
  type: 'diagnosis' | 'treatment' | 'medication' | 'test' | 'follow_up';
  confidence: number; // 0-100
  recommendation: string;
  rationale: string;
  evidence: string[];
  accepted?: boolean;
  rejectedReason?: string;
}

interface VoiceTranscription {
  id: string;
  text: string;
  confidence: number;
  timestamp: string;
  speakerId: string;
  language: string;
  medicalTerms: MedicalTerm[];
  suggestions: string[];
}

interface MedicalTerm {
  term: string;
  type: 'medication' | 'diagnosis' | 'procedure' | 'anatomy' | 'symptom';
  confidence: number;
  alternatives: string[];
}

interface WorkflowMetrics {
  efficiency: number;
  timePerStep: Record<string, number>;
  errorRate: number;
  patientSatisfaction: number;
  providerSatisfaction: number;
  completionRate: number;
  averageInterruptions: number;
}

interface HealthcareWorkflowContextType {
  activeWorkflow: ActiveWorkflow | null;
  workflowTemplates: WorkflowTemplate[];
  isRecording: boolean;
  transcription: VoiceTranscription | null;
  clinicalAlerts: ClinicalAlert[];
  aiRecommendations: AIRecommendation[];
  workflowMetrics: WorkflowMetrics | null;

  // Workflow Management
  startWorkflow: (templateId: string, patientId: string, appointmentId?: string) => Promise<ActiveWorkflow>;
  nextStep: () => Promise<void>;
  previousStep: () => Promise<void>;
  skipStep: (reason: string) => Promise<void>;
  completeWorkflow: () => Promise<void>;
  pauseWorkflow: (reason: string) => Promise<void>;
  resumeWorkflow: () => Promise<void>;

  // Voice-to-Text
  startVoiceRecording: () => Promise<void>;
  stopVoiceRecording: () => Promise<VoiceTranscription>;
  clearTranscription: () => void;

  // AI Assistance
  getAIRecommendations: (context: WorkflowContext) => Promise<AIRecommendation[]>;
  acceptRecommendation: (recommendationId: string) => Promise<void>;
  rejectRecommendation: (recommendationId: string, reason: string) => Promise<void>;

  // Clinical Alerts
  acknowledgeAlert: (alertId: string) => Promise<void>;
  dismissAlert: (alertId: string) => Promise<void>;

  // Analytics
  trackWorkflowStep: (stepId: string, duration: number) => Promise<void>;
  trackUserInteraction: (action: string, context: any) => Promise<void>;
  getWorkflowMetrics: (timeRange: string) => Promise<WorkflowMetrics>;
}

const HealthcareWorkflowContext = createContext<HealthcareWorkflowContextType | undefined>(undefined);

interface HealthcareWorkflowProviderProps {
  children: ReactNode;
}

export const HealthcareWorkflowProvider: React.FC<HealthcareWorkflowProviderProps> = ({ children }) => {
  const [activeWorkflow, setActiveWorkflow] = useState<ActiveWorkflow | null>(null);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<VoiceTranscription | null>(null);
  const [clinicalAlerts, setClinicalAlerts] = useState<ClinicalAlert[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [workflowMetrics, setWorkflowMetrics] = useState<WorkflowMetrics | null>(null);

  const { user } = useAuth();
  const { auditSecurityEvent } = useSecurity();
  const { trackEvent, trackTiming } = useAnalytics();
  const queryClient = useQueryClient();

  // Load workflow templates
  const { data: templates } = useQuery({
    queryKey: ['workflowTemplates'],
    queryFn: () => apiService.getWorkflowTemplates(),
  });

  // Load clinical alerts
  const { data: alerts } = useQuery({
    queryKey: ['clinicalAlerts', user?.id],
    queryFn: () => apiService.getClinicalAlerts(user?.id || ''),
    enabled: !!user,
  });

  useEffect(() => {
    if (templates) {
      setWorkflowTemplates(templates);
    }
  }, [templates]);

  useEffect(() => {
    if (alerts) {
      setClinicalAlerts(alerts);
    }
  }, [alerts]);

  useEffect(() => {
    initializeVoiceRecognition();
    return () => {
      cleanupVoiceRecognition();
    };
  }, []);

  const initializeVoiceRecognition = async (): Promise<void> => {
    try {
      Voice.onSpeechStart = () => {
        console.log('Speech recognition started');
      };

      Voice.onSpeechEnd = () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
      };

      Voice.onSpeechResults = (event) => {
        if (event.value && event.value.length > 0) {
          const text = event.value[0];
          const newTranscription: VoiceTranscription = {
            id: Date.now().toString(),
            text,
            confidence: 0.95, // This would come from the speech API
            timestamp: new Date().toISOString(),
            speakerId: user?.id || 'unknown',
            language: 'en-US',
            medicalTerms: extractMedicalTerms(text),
            suggestions: generateSuggestions(text),
          };
          setTranscription(newTranscription);
        }
      };

      Voice.onSpeechError = (error) => {
        console.error('Speech recognition error:', error);
        setIsRecording(false);
        Alert.alert('Voice Recognition Error', 'Unable to process speech. Please try again.');
      };
    } catch (error) {
      console.error('Voice recognition initialization failed:', error);
    }
  };

  const cleanupVoiceRecognition = (): void => {
    Voice.removeAllListeners();
  };

  const extractMedicalTerms = (text: string): MedicalTerm[] => {
    // This would use a medical NLP library or API
    // For now, return empty array
    return [];
  };

  const generateSuggestions = (text: string): string[] => {
    // This would use AI to generate clinical documentation suggestions
    // For now, return empty array
    return [];
  };

  const startWorkflow = async (
    templateId: string,
    patientId: string,
    appointmentId?: string
  ): Promise<ActiveWorkflow> => {
    try {
      const template = workflowTemplates.find(t => t.id === templateId);
      if (!template) {
        throw new Error('Workflow template not found');
      }

      // Load patient context
      const patient = await apiService.getPatient(patientId);
      const appointment = appointmentId ? await apiService.getAppointment(appointmentId) : undefined;
      const previousNotes = await apiService.getPatientNotes(patientId, { limit: 5 });
      const currentMedications = await apiService.getPatientMedications(patientId);
      const recentVitals = await apiService.getPatientVitals(patientId, { limit: 3 });
      const healthTrends = await apiService.getPatientHealthTrends(patientId);

      const context: WorkflowContext = {
        patient,
        appointment,
        previousNotes,
        currentMedications,
        recentVitals,
        healthTrends,
        alerts: clinicalAlerts.filter(alert => alert.type === 'critical'),
      };

      const workflow: ActiveWorkflow = {
        id: `workflow_${Date.now()}`,
        templateId,
        patientId,
        providerId: user?.id || '',
        appointmentId,
        currentStep: 0,
        steps: template.steps.map(step => ({ ...step, status: 'pending' })),
        startTime: new Date().toISOString(),
        estimatedEndTime: new Date(Date.now() + template.averageTime * 60000).toISOString(),
        interruptions: [],
        context,
        aiRecommendations: [],
      };

      setActiveWorkflow(workflow);

      // Get AI recommendations
      const recommendations = await getAIRecommendations(context);
      setAiRecommendations(recommendations);

      // Track workflow start
      trackEvent('workflow_started', {
        templateId,
        patientId,
        providerId: user?.id,
        estimatedTime: template.averageTime,
      });

      // Security audit
      await auditSecurityEvent({
        userId: user?.id || '',
        action: 'workflow_started',
        resource: 'healthcare_workflow',
        ipAddress: 'local',
        userAgent: 'mobile-app',
        success: true,
        metadata: { templateId, patientId },
      });

      return workflow;
    } catch (error) {
      console.error('Failed to start workflow:', error);
      throw error;
    }
  };

  const nextStep = async (): Promise<void> => {
    if (!activeWorkflow || activeWorkflow.currentStep >= activeWorkflow.steps.length - 1) {
      return;
    }

    const currentStep = activeWorkflow.steps[activeWorkflow.currentStep];
    const stepStartTime = Date.now();

    // Mark current step as completed
    currentStep.status = 'completed';
    currentStep.actualTime = (stepStartTime - new Date(activeWorkflow.startTime).getTime()) / 60000;

    // Move to next step
    const nextStepIndex = activeWorkflow.currentStep + 1;
    const nextStep = activeWorkflow.steps[nextStepIndex];
    nextStep.status = 'in_progress';

    const updatedWorkflow = {
      ...activeWorkflow,
      currentStep: nextStepIndex,
      steps: [...activeWorkflow.steps],
    };

    setActiveWorkflow(updatedWorkflow);

    // Track step completion
    await trackWorkflowStep(currentStep.id, currentStep.actualTime || 0);

    trackEvent('workflow_step_completed', {
      workflowId: activeWorkflow.id,
      stepId: currentStep.id,
      stepName: currentStep.name,
      duration: currentStep.actualTime,
    });
  };

  const completeWorkflow = async (): Promise<void> => {
    if (!activeWorkflow) return;

    const endTime = new Date().toISOString();
    const totalTime = (new Date(endTime).getTime() - new Date(activeWorkflow.startTime).getTime()) / 60000;

    // Mark workflow as completed
    const completedWorkflow = {
      ...activeWorkflow,
      actualEndTime: endTime,
      steps: activeWorkflow.steps.map(step => ({
        ...step,
        status: step.status === 'in_progress' ? 'completed' : step.status,
      })),
    };

    // Save workflow to backend
    await apiService.saveWorkflow(completedWorkflow);

    // Update metrics
    await getWorkflowMetrics('today');

    trackEvent('workflow_completed', {
      workflowId: activeWorkflow.id,
      templateId: activeWorkflow.templateId,
      totalTime,
      interruptions: activeWorkflow.interruptions.length,
    });

    setActiveWorkflow(null);
  };

  const startVoiceRecording = async (): Promise<void> => {
    try {
      setIsRecording(true);
      await Voice.start('en-US');

      trackEvent('voice_recording_started', {
        workflowId: activeWorkflow?.id,
        stepId: activeWorkflow?.steps[activeWorkflow.currentStep]?.id,
      });
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      setIsRecording(false);
      Alert.alert('Voice Recording Error', 'Unable to start voice recording.');
    }
  };

  const stopVoiceRecording = async (): Promise<VoiceTranscription> => {
    try {
      await Voice.stop();
      setIsRecording(false);

      if (transcription) {
        trackEvent('voice_recording_completed', {
          workflowId: activeWorkflow?.id,
          textLength: transcription.text.length,
          confidence: transcription.confidence,
        });

        return transcription;
      }

      throw new Error('No transcription available');
    } catch (error) {
      console.error('Failed to stop voice recording:', error);
      throw error;
    }
  };

  const getAIRecommendations = async (context: WorkflowContext): Promise<AIRecommendation[]> => {
    try {
      const recommendations = await apiService.getAIRecommendations({
        patientId: context.patient.id,
        currentMedications: context.currentMedications,
        recentVitals: context.recentVitals,
        previousNotes: context.previousNotes,
        currentStep: activeWorkflow?.steps[activeWorkflow.currentStep],
      });

      trackEvent('ai_recommendations_received', {
        patientId: context.patient.id,
        recommendationCount: recommendations.length,
      });

      return recommendations;
    } catch (error) {
      console.error('Failed to get AI recommendations:', error);
      return [];
    }
  };

  const trackWorkflowStep = async (stepId: string, duration: number): Promise<void> => {
    try {
      await apiService.trackWorkflowStep({
        stepId,
        duration,
        providerId: user?.id || '',
        timestamp: new Date().toISOString(),
      });

      trackTiming('workflow_step_duration', duration, {
        stepId,
        providerId: user?.id,
      });
    } catch (error) {
      console.error('Failed to track workflow step:', error);
    }
  };

  const getWorkflowMetrics = async (timeRange: string): Promise<WorkflowMetrics> => {
    try {
      const metrics = await apiService.getWorkflowMetrics({
        providerId: user?.id || '',
        timeRange,
      });

      setWorkflowMetrics(metrics);
      return metrics;
    } catch (error) {
      console.error('Failed to get workflow metrics:', error);
      throw error;
    }
  };

  // Placeholder implementations for other methods
  const previousStep = async (): Promise<void> => {
    // Implementation for going back a step
  };

  const skipStep = async (reason: string): Promise<void> => {
    // Implementation for skipping a step
  };

  const pauseWorkflow = async (reason: string): Promise<void> => {
    // Implementation for pausing workflow
  };

  const resumeWorkflow = async (): Promise<void> => {
    // Implementation for resuming workflow
  };

  const clearTranscription = (): void => {
    setTranscription(null);
  };

  const acceptRecommendation = async (recommendationId: string): Promise<void> => {
    // Implementation for accepting AI recommendation
  };

  const rejectRecommendation = async (recommendationId: string, reason: string): Promise<void> => {
    // Implementation for rejecting AI recommendation
  };

  const acknowledgeAlert = async (alertId: string): Promise<void> => {
    // Implementation for acknowledging clinical alert
  };

  const dismissAlert = async (alertId: string): Promise<void> => {
    // Implementation for dismissing clinical alert
  };

  const trackUserInteraction = async (action: string, context: any): Promise<void> => {
    trackEvent('user_interaction', { action, context });
  };

  const value: HealthcareWorkflowContextType = {
    activeWorkflow,
    workflowTemplates,
    isRecording,
    transcription,
    clinicalAlerts,
    aiRecommendations,
    workflowMetrics,
    startWorkflow,
    nextStep,
    previousStep,
    skipStep,
    completeWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    startVoiceRecording,
    stopVoiceRecording,
    clearTranscription,
    getAIRecommendations,
    acceptRecommendation,
    rejectRecommendation,
    acknowledgeAlert,
    dismissAlert,
    trackWorkflowStep,
    trackUserInteraction,
    getWorkflowMetrics,
  };

  return (
    <HealthcareWorkflowContext.Provider value={value}>
      {children}
    </HealthcareWorkflowContext.Provider>
  );
};

export const useHealthcareWorkflow = (): HealthcareWorkflowContextType => {
  const context = useContext(HealthcareWorkflowContext);
  if (context === undefined) {
    throw new Error('useHealthcareWorkflow must be used within a HealthcareWorkflowProvider');
  }
  return context;
};