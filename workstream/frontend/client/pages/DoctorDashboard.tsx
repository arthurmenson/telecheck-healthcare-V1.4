import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { CompactAIScribe } from "../components/CompactAIScribe";
import { useAuth } from "../contexts/AuthContext";
import {
  Stethoscope,
  Users,
  Calendar,
  FileText,
  Brain,
  Pill,
  AlertTriangle,
  CheckCircle,
  Clock,
  Video,
  Search,
  Filter,
  Plus,
  TrendingUp,
  Activity,
  MessageCircle,
  Phone,
  Eye,
  Edit,
  Send,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  useProviderSchedule,
  useDashboardMetrics,
  useClinicalAlerts,
  usePatients,
} from "../hooks/api/useClinical";

export function DoctorDashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showScribeWidget, setShowScribeWidget] = useState(false);

  // API Hooks
  const { data: dashboardMetrics, isLoading: metricsLoading } = useDashboardMetrics(user?.id);
  const { data: scheduleData, isLoading: scheduleLoading } = useProviderSchedule(
    user?.id || '',
    new Date().toISOString().split('T')[0]
  );
  const { data: clinicalAlerts, isLoading: alertsLoading } = useClinicalAlerts({
    severity: 'high',
    status: 'active',
    limit: 5,
  });
  const { data: patientsData, isLoading: patientsLoading } = usePatients({
    assignedTo: user?.id,
    limit: 10,
  });

  // Real data from API
  const todaysAppointments = scheduleData || [];
  const recentPatients = patientsData?.patients || [];

  // Use clinical alerts as pending reviews
  const pendingReviews = clinicalAlerts || [];


  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "bg-red-100 text-red-800";
      case "moderate":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen aurora-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Doctor Portal
                </h1>
                <p className="text-muted-foreground">
                  Welcome back, {user?.name} • {user?.specialization}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline">{user?.license}</Badge>
                  <Badge variant="outline">{user?.organization}</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </Button>
              <Button className="gradient-bg text-white border-0" asChild>
                <Link to="/consultation/new">
                  <Video className="w-4 h-4 mr-2" />
                  Start Consultation
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass-morphism border border-border/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Today's Patients
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {metricsLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      dashboardMetrics?.todayAppointments || 0
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border border-border/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pending Reviews
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {metricsLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      dashboardMetrics?.pendingTasks || 0
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border border-border/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    AI Consultations
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {metricsLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      dashboardMetrics?.completedAppointments || 0
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border border-border/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Prescriptions</p>
                  <p className="text-3xl font-bold text-foreground">
                    {metricsLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      dashboardMetrics?.activePatients || 0
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <Pill className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Schedule */}
          <div className="lg:col-span-2">
            <Card className="glass-morphism border border-border/20">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scheduleLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading schedule...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todaysAppointments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No appointments scheduled for today
                      </div>
                    ) : (
                      todaysAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="glass-morphism p-4 rounded-xl border border-border/10 hover-lift"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Clock className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">
                                  {new Date(appointment.startTime).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {appointment.patient?.firstName} {appointment.patient?.lastName}
                                </div>
                              </div>
                            </div>
                            <Badge className={getStatusColor(appointment.status)}>
                              {appointment.status.replace("_", " ")}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Type:</span>
                              <div className="font-medium">{appointment.type}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Reason:
                              </span>
                              <div className="font-medium">
                                {appointment.reason}
                              </div>
                            </div>
                          </div>

                          {appointment.notes && (
                            <div className="mt-2 text-sm">
                              <span className="text-muted-foreground">Notes:</span>
                              <div className="font-medium">{appointment.notes}</div>
                            </div>
                          )}

                          <div className="flex justify-end space-x-2 mt-3">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              className="gradient-bg text-white border-0"
                              asChild
                            >
                              <Link to={`/consultation/${appointment.id}`}>
                                <Video className="w-4 h-4 mr-1" />
                                Start
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Patients */}
            <Card className="glass-morphism border border-border/20 mt-6">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Recent Patients
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading patients...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentPatients.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No patients assigned
                      </div>
                    ) : (
                      recentPatients.map((patient) => (
                        <div
                          key={patient.id}
                          className="glass-morphism p-4 rounded-xl border border-border/10 hover-lift"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-foreground mb-1">
                                {patient.firstName} {patient.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground mb-2">
                                DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{patient.gender}</Badge>
                                <Badge variant="outline">{patient.identifier}</Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground mb-2">
                                Contact
                              </div>
                              <div className="text-sm font-medium text-foreground">
                                {patient.phone || patient.email || 'No contact info'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pending Reviews */}
            <Card className="glass-morphism border border-border/20">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground flex items-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                  Pending Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading alerts...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingReviews.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No pending reviews
                      </div>
                    ) : (
                      pendingReviews.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-3 rounded-lg border border-border/10 bg-background/50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity} severity
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(alert.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-foreground mb-1">
                            Patient ID: {alert.patientId}
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">
                            {alert.type.replace('-', ' ').toUpperCase()}
                          </div>
                          <div className="text-xs text-foreground">
                            {alert.message}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                          >
                            Review Alert
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="glass-morphism border border-border/20">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/ehr/ai-scribe">
                    <Brain className="w-4 h-4 mr-2" />
                    AI Medical Scribe
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  New Prescription
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Brain className="w-4 h-4 mr-2" />
                  AI Diagnosis
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Lab Orders
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Patient Messages
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Floating AI Scribe Widget Toggle */}
        {!showScribeWidget && (
          <div className="fixed bottom-4 right-4 z-40">
            <Button
              onClick={() => setShowScribeWidget(true)}
              className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-lg"
              title="Open AI Scribe"
            >
              <Brain className="w-6 h-6" />
            </Button>
          </div>
        )}

        {/* Floating AI Scribe Widget */}
        {showScribeWidget && (
          <CompactAIScribe
            patientName="Quick Recording"
            appointmentType="Dashboard Notes"
            onTranscriptionComplete={(transcript) => {
              console.log("Dashboard transcript:", transcript);
            }}
            isExpanded={false}
            onToggleExpand={() => setShowScribeWidget(false)}
            className="fixed bottom-4 right-4 z-50"
          />
        )}
      </div>
    </div>
  );
}
