import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Patient, HealthMetrics } from '@/types/healthcare';
import { User } from '@/types/auth';
import { useAuth } from '@/services/auth/AuthProvider';
import { useAnalytics } from '@/services/analytics/AnalyticsProvider';
import { apiService } from '@/services/api/apiService';

interface EngagementScore {
  overall: number; // 0-100
  categories: {
    appUsage: number;
    appointmentCompliance: number;
    medicationAdherence: number;
    healthMonitoring: number;
    communicationResponse: number;
    satisfactionSurveys: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  lastUpdated: string;
}

interface PatientJourney {
  id: string;
  patientId: string;
  stage: JourneyStage;
  milestones: Milestone[];
  touchpoints: Touchpoint[];
  satisfaction: SatisfactionMetrics;
  healthOutcomes: HealthOutcome[];
  engagementHistory: EngagementEvent[];
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  targetDate: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  importance: 'low' | 'medium' | 'high' | 'critical';
  rewards?: Reward[];
}

interface Touchpoint {
  id: string;
  type: TouchpointType;
  channel: 'app' | 'email' | 'sms' | 'call' | 'in_person';
  content: string;
  scheduledDate: string;
  completedDate?: string;
  response?: TouchpointResponse;
  effectiveness: number; // 0-100
}

interface SatisfactionMetrics {
  overallScore: number; // 0-100
  npsScore: number; // -100 to 100
  categories: {
    careQuality: number;
    communication: number;
    convenience: number;
    technology: number;
    costTransparency: number;
  };
  surveys: SatisfactionSurvey[];
  feedback: PatientFeedback[];
}

interface HealthOutcome {
  id: string;
  metric: string;
  baselineValue: number;
  currentValue: number;
  targetValue: number;
  improvement: number;
  measurementDate: string;
  source: 'self_reported' | 'clinical' | 'wearable';
}

interface EngagementEvent {
  id: string;
  type: EngagementEventType;
  timestamp: string;
  duration?: number; // seconds
  value?: number;
  metadata?: Record<string, any>;
  context: EngagementContext;
}

interface Reward {
  id: string;
  type: 'points' | 'badge' | 'discount' | 'early_access' | 'recognition';
  value: number;
  description: string;
  imageUrl?: string;
  earnedDate: string;
  expirationDate?: string;
  claimed: boolean;
}

interface SatisfactionSurvey {
  id: string;
  name: string;
  questions: SurveyQuestion[];
  responses: SurveyResponse[];
  scheduledDate: string;
  completedDate?: string;
  score?: number;
}

interface PatientFeedback {
  id: string;
  type: 'complaint' | 'compliment' | 'suggestion' | 'question';
  content: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'in_review' | 'responded' | 'resolved';
  submittedDate: string;
  responseDate?: string;
  response?: string;
  satisfaction?: number; // 1-5
}

interface PersonalizedContent {
  id: string;
  type: 'educational' | 'motivational' | 'reminder' | 'celebration';
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  relevanceScore: number; // 0-100
  personalizedFor: string[];
  scheduledDate: string;
  deliveredDate?: string;
  engagement?: ContentEngagement;
}

interface ContentEngagement {
  views: number;
  timeSpent: number; // seconds
  interactionRate: number; // 0-100
  shareCount: number;
  rating?: number; // 1-5
}

interface EngagementGoal {
  id: string;
  patientId: string;
  type: 'health' | 'engagement' | 'satisfaction' | 'compliance';
  description: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
  progress: number; // 0-100
  rewards: Reward[];
  isActive: boolean;
}

interface PatientEngagementContextType {
  engagementScore: EngagementScore | null;
  patientJourney: PatientJourney | null;
  personalizedContent: PersonalizedContent[];
  activeGoals: EngagementGoal[];
  rewards: Reward[];
  satisfactionMetrics: SatisfactionMetrics | null;

  // Engagement Tracking
  trackEngagementEvent: (event: Omit<EngagementEvent, 'id' | 'timestamp'>) => Promise<void>;
  updateEngagementScore: () => Promise<EngagementScore>;
  getPersonalizedContent: () => Promise<PersonalizedContent[]>;

  // Patient Journey
  updateJourneyStage: (stage: JourneyStage) => Promise<void>;
  completeMilestone: (milestoneId: string) => Promise<void>;
  addTouchpoint: (touchpoint: Omit<Touchpoint, 'id'>) => Promise<void>;

  // Satisfaction Management
  submitFeedback: (feedback: Omit<PatientFeedback, 'id' | 'submittedDate'>) => Promise<void>;
  completeSatisfactionSurvey: (surveyId: string, responses: SurveyResponse[]) => Promise<void>;
  requestSatisfactionSurvey: () => Promise<void>;

  // Goal Management
  createGoal: (goal: Omit<EngagementGoal, 'id' | 'currentValue' | 'progress'>) => Promise<void>;
  updateGoalProgress: (goalId: string, progress: number) => Promise<void>;
  claimReward: (rewardId: string) => Promise<void>;

  // Content Interaction
  trackContentEngagement: (contentId: string, engagement: Partial<ContentEngagement>) => Promise<void>;
  shareContent: (contentId: string, channel: string) => Promise<void>;
  rateContent: (contentId: string, rating: number) => Promise<void>;

  // Health Outcomes
  recordHealthOutcome: (outcome: Omit<HealthOutcome, 'id'>) => Promise<void>;
  getHealthTrends: (timeRange: string) => Promise<HealthOutcome[]>;

  // Gamification
  earnReward: (type: string, value: number, description: string) => Promise<Reward>;
  getLeaderboard: (category: string) => Promise<LeaderboardEntry[]>;
}

// Type definitions
type JourneyStage = 'onboarding' | 'active' | 'engaged' | 'at_risk' | 'inactive' | 'returning';
type TouchpointType = 'welcome' | 'reminder' | 'education' | 'celebration' | 'support' | 'survey';
type TouchpointResponse = 'opened' | 'clicked' | 'completed' | 'ignored' | 'opted_out';
type EngagementEventType = 'app_open' | 'feature_use' | 'content_view' | 'goal_complete' | 'survey_complete';

interface EngagementContext {
  patientId: string;
  sessionId: string;
  feature?: string;
  screen?: string;
  action?: string;
}

interface SurveyQuestion {
  id: string;
  type: 'rating' | 'multiple_choice' | 'text' | 'yes_no';
  question: string;
  options?: string[];
  required: boolean;
}

interface SurveyResponse {
  questionId: string;
  value: string | number;
}

interface LeaderboardEntry {
  patientId: string;
  name: string;
  score: number;
  rank: number;
  category: string;
}

const PatientEngagementContext = createContext<PatientEngagementContextType | undefined>(undefined);

interface PatientEngagementProviderProps {
  children: ReactNode;
}

export const PatientEngagementProvider: React.FC<PatientEngagementProviderProps> = ({ children }) => {
  const [engagementScore, setEngagementScore] = useState<EngagementScore | null>(null);
  const [patientJourney, setPatientJourney] = useState<PatientJourney | null>(null);
  const [personalizedContent, setPersonalizedContent] = useState<PersonalizedContent[]>([]);
  const [activeGoals, setActiveGoals] = useState<EngagementGoal[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [satisfactionMetrics, setSatisfactionMetrics] = useState<SatisfactionMetrics | null>(null);

  const { user } = useAuth();
  const { trackEvent, trackTiming, setUserProperties } = useAnalytics();
  const queryClient = useQueryClient();

  // Load patient engagement data
  const { data: engagementData } = useQuery({
    queryKey: ['patientEngagement', user?.id],
    queryFn: () => apiService.getPatientEngagement(user?.id || ''),
    enabled: !!user && user.roles.some(role => role.type === 'patient'),
  });

  // Load personalized content
  const { data: contentData } = useQuery({
    queryKey: ['personalizedContent', user?.id],
    queryFn: () => apiService.getPersonalizedContent(user?.id || ''),
    enabled: !!user,
  });

  useEffect(() => {
    if (engagementData) {
      setEngagementScore(engagementData.score);
      setPatientJourney(engagementData.journey);
      setActiveGoals(engagementData.goals);
      setRewards(engagementData.rewards);
      setSatisfactionMetrics(engagementData.satisfaction);

      // Update analytics user properties
      setUserProperties({
        engagementScore: engagementData.score?.overall,
        journeyStage: engagementData.journey?.stage,
        npsScore: engagementData.satisfaction?.npsScore,
      });
    }
  }, [engagementData]);

  useEffect(() => {
    if (contentData) {
      setPersonalizedContent(contentData);
    }
  }, [contentData]);

  useEffect(() => {
    // Track app session start
    trackEngagementEvent({
      type: 'app_open',
      context: {
        patientId: user?.id || '',
        sessionId: generateSessionId(),
      },
    });

    // Setup background health data collection
    setupHealthDataCollection();
  }, [user]);

  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const setupHealthDataCollection = async (): Promise<void> => {
    // This would integrate with health data sources like Apple Health, Google Fit, etc.
    // For now, just a placeholder
    try {
      if (Platform.OS === 'ios') {
        // Setup Apple Health integration
      } else {
        // Setup Google Fit integration
      }
    } catch (error) {
      console.error('Health data collection setup failed:', error);
    }
  };

  const trackEngagementEvent = async (
    event: Omit<EngagementEvent, 'id' | 'timestamp'>
  ): Promise<void> => {
    try {
      const engagementEvent: EngagementEvent = {
        ...event,
        id: `event_${Date.now()}`,
        timestamp: new Date().toISOString(),
      };

      // Send to backend
      await apiService.trackEngagementEvent(engagementEvent);

      // Track in analytics
      trackEvent('engagement_event', {
        type: event.type,
        patientId: event.context.patientId,
        feature: event.context.feature,
        screen: event.context.screen,
      });

      // Update engagement score periodically
      if (Math.random() < 0.1) { // 10% chance to update score
        await updateEngagementScore();
      }
    } catch (error) {
      console.error('Failed to track engagement event:', error);
    }
  };

  const updateEngagementScore = async (): Promise<EngagementScore> => {
    try {
      const score = await apiService.calculateEngagementScore(user?.id || '');
      setEngagementScore(score);

      trackEvent('engagement_score_updated', {
        patientId: user?.id,
        score: score.overall,
        trend: score.trend,
      });

      return score;
    } catch (error) {
      console.error('Failed to update engagement score:', error);
      throw error;
    }
  };

  const getPersonalizedContent = async (): Promise<PersonalizedContent[]> => {
    try {
      const content = await apiService.getPersonalizedContent(user?.id || '');
      setPersonalizedContent(content);

      trackEvent('personalized_content_loaded', {
        patientId: user?.id,
        contentCount: content.length,
      });

      return content;
    } catch (error) {
      console.error('Failed to get personalized content:', error);
      return [];
    }
  };

  const submitFeedback = async (
    feedback: Omit<PatientFeedback, 'id' | 'submittedDate'>
  ): Promise<void> => {
    try {
      const newFeedback: PatientFeedback = {
        ...feedback,
        id: `feedback_${Date.now()}`,
        submittedDate: new Date().toISOString(),
      };

      await apiService.submitPatientFeedback(newFeedback);

      trackEvent('patient_feedback_submitted', {
        patientId: user?.id,
        type: feedback.type,
        category: feedback.category,
        priority: feedback.priority,
      });

      // Show success notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Feedback Received',
          body: 'Thank you for your feedback. We will review it shortly.',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  };

  const completeSatisfactionSurvey = async (
    surveyId: string,
    responses: SurveyResponse[]
  ): Promise<void> => {
    try {
      await apiService.submitSatisfactionSurvey(surveyId, responses);

      trackEvent('satisfaction_survey_completed', {
        patientId: user?.id,
        surveyId,
        responseCount: responses.length,
      });

      // Update satisfaction metrics
      const updatedMetrics = await apiService.getSatisfactionMetrics(user?.id || '');
      setSatisfactionMetrics(updatedMetrics);

      // Earn reward for completing survey
      await earnReward('points', 50, 'Completed satisfaction survey');
    } catch (error) {
      console.error('Failed to complete satisfaction survey:', error);
      throw error;
    }
  };

  const createGoal = async (
    goal: Omit<EngagementGoal, 'id' | 'currentValue' | 'progress'>
  ): Promise<void> => {
    try {
      const newGoal: EngagementGoal = {
        ...goal,
        id: `goal_${Date.now()}`,
        currentValue: 0,
        progress: 0,
      };

      await apiService.createEngagementGoal(newGoal);
      setActiveGoals(prev => [...prev, newGoal]);

      trackEvent('engagement_goal_created', {
        patientId: user?.id,
        type: goal.type,
        targetValue: goal.targetValue,
      });
    } catch (error) {
      console.error('Failed to create goal:', error);
      throw error;
    }
  };

  const updateGoalProgress = async (goalId: string, progress: number): Promise<void> => {
    try {
      await apiService.updateGoalProgress(goalId, progress);

      setActiveGoals(prev =>
        prev.map(goal =>
          goal.id === goalId
            ? { ...goal, progress, currentValue: (goal.targetValue * progress) / 100 }
            : goal
        )
      );

      trackEvent('goal_progress_updated', {
        patientId: user?.id,
        goalId,
        progress,
      });

      // Check if goal is completed
      if (progress >= 100) {
        await earnReward('badge', 1, 'Goal completed!');
      }
    } catch (error) {
      console.error('Failed to update goal progress:', error);
      throw error;
    }
  };

  const earnReward = async (type: string, value: number, description: string): Promise<Reward> => {
    try {
      const reward: Reward = {
        id: `reward_${Date.now()}`,
        type: type as any,
        value,
        description,
        earnedDate: new Date().toISOString(),
        claimed: false,
      };

      await apiService.earnReward(reward);
      setRewards(prev => [...prev, reward]);

      trackEvent('reward_earned', {
        patientId: user?.id,
        type,
        value,
        description,
      });

      // Show notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reward Earned!',
          body: description,
        },
        trigger: null,
      });

      return reward;
    } catch (error) {
      console.error('Failed to earn reward:', error);
      throw error;
    }
  };

  const trackContentEngagement = async (
    contentId: string,
    engagement: Partial<ContentEngagement>
  ): Promise<void> => {
    try {
      await apiService.trackContentEngagement(contentId, engagement);

      trackEvent('content_engagement', {
        patientId: user?.id,
        contentId,
        ...engagement,
      });
    } catch (error) {
      console.error('Failed to track content engagement:', error);
    }
  };

  const recordHealthOutcome = async (outcome: Omit<HealthOutcome, 'id'>): Promise<void> => {
    try {
      const healthOutcome: HealthOutcome = {
        ...outcome,
        id: `outcome_${Date.now()}`,
      };

      await apiService.recordHealthOutcome(healthOutcome);

      trackEvent('health_outcome_recorded', {
        patientId: user?.id,
        metric: outcome.metric,
        improvement: outcome.improvement,
      });

      // Check for improvement milestones
      if (outcome.improvement > 10) {
        await earnReward('points', 25, `Improved ${outcome.metric} by ${outcome.improvement}%`);
      }
    } catch (error) {
      console.error('Failed to record health outcome:', error);
      throw error;
    }
  };

  // Placeholder implementations for remaining methods
  const updateJourneyStage = async (stage: JourneyStage): Promise<void> => {
    // Implementation for updating patient journey stage
  };

  const completeMilestone = async (milestoneId: string): Promise<void> => {
    // Implementation for completing milestone
  };

  const addTouchpoint = async (touchpoint: Omit<Touchpoint, 'id'>): Promise<void> => {
    // Implementation for adding touchpoint
  };

  const requestSatisfactionSurvey = async (): Promise<void> => {
    // Implementation for requesting satisfaction survey
  };

  const claimReward = async (rewardId: string): Promise<void> => {
    // Implementation for claiming reward
  };

  const shareContent = async (contentId: string, channel: string): Promise<void> => {
    // Implementation for sharing content
  };

  const rateContent = async (contentId: string, rating: number): Promise<void> => {
    // Implementation for rating content
  };

  const getHealthTrends = async (timeRange: string): Promise<HealthOutcome[]> => {
    // Implementation for getting health trends
    return [];
  };

  const getLeaderboard = async (category: string): Promise<LeaderboardEntry[]> => {
    // Implementation for getting leaderboard
    return [];
  };

  const value: PatientEngagementContextType = {
    engagementScore,
    patientJourney,
    personalizedContent,
    activeGoals,
    rewards,
    satisfactionMetrics,
    trackEngagementEvent,
    updateEngagementScore,
    getPersonalizedContent,
    updateJourneyStage,
    completeMilestone,
    addTouchpoint,
    submitFeedback,
    completeSatisfactionSurvey,
    requestSatisfactionSurvey,
    createGoal,
    updateGoalProgress,
    claimReward,
    trackContentEngagement,
    shareContent,
    rateContent,
    recordHealthOutcome,
    getHealthTrends,
    earnReward,
    getLeaderboard,
  };

  return (
    <PatientEngagementContext.Provider value={value}>
      {children}
    </PatientEngagementContext.Provider>
  );
};

export const usePatientEngagement = (): PatientEngagementContextType => {
  const context = useContext(PatientEngagementContext);
  if (context === undefined) {
    throw new Error('usePatientEngagement must be used within a PatientEngagementProvider');
  }
  return context;
};