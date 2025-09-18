import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { useAuth } from "../contexts/AuthContext";
import {
  Heart,
  Users,
  Activity,
  Clock,
  MessageCircle,
  Calendar,
  HeartPulse,
  User,
  CheckCircle2,
  AlertCircle,
  Home,
  Phone,
  Pill,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  usePatients,
  useProviderSchedule,
  useDashboardMetrics,
  useClinicalAlerts,
} from "../hooks/api/useClinical";

export function CaregiverDashboard() {
  const { user } = useAuth();

  // API Hooks
  const { data: patientsData, isLoading: patientsLoading } = usePatients({
    assignedTo: user?.id,
    limit: 10,
  });
  const { data: scheduleData, isLoading: scheduleLoading } = useProviderSchedule(
    user?.id || '',
    new Date().toISOString().split('T')[0]
  );
  const { data: dashboardMetrics, isLoading: metricsLoading } = useDashboardMetrics(user?.id);
  const { data: clinicalAlerts, isLoading: alertsLoading } = useClinicalAlerts({
    status: 'active',
    limit: 5,
  });

  // Real data from API
  const careRecipients = patientsData?.patients || [];
  const todaysSchedule = scheduleData || [];
  const alerts = clinicalAlerts || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Caregiver Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Home className="w-4 h-4 mr-1" />
            Active Care
          </Badge>
          <Button variant="outline" size="sm">
            <Phone className="w-4 h-4 mr-2" />
            Emergency Contact
          </Button>
        </div>
      </div>

      {/* Patient Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Care Recipients</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patientsLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                careRecipients.length
              )}
            </div>
            <p className="text-xs text-muted-foreground">Under your care</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                `${dashboardMetrics?.completedAppointments || 0}/${dashboardMetrics?.todayAppointments || 0}`
              )}
            </div>
            <Progress
              value={dashboardMetrics?.todayAppointments ?
                (dashboardMetrics.completedAppointments / dashboardMetrics.todayAppointments) * 100 : 0
              }
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vitals Recorded</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                dashboardMetrics?.activePatients || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Active patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Care Hours</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                dashboardMetrics?.todayAppointments ? (dashboardMetrics.todayAppointments * 0.5).toFixed(1) : '0'
              )}
            </div>
            <p className="text-xs text-muted-foreground">Today's hours (est.)</p>
          </CardContent>
        </Card>
      </div>

      {/* Patient Care Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Patients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Current Patients
            </CardTitle>
            <CardDescription>
              People under your care today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {patientsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading patients...</span>
              </div>
            ) : careRecipients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No patients assigned
              </div>
            ) : (
              careRecipients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {patient.identifier}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                      Active
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {patient.email || patient.phone || 'No contact'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Today's Care Schedule
            </CardTitle>
            <CardDescription>
              Planned activities and appointments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scheduleLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading schedule...</span>
              </div>
            ) : todaysSchedule.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No appointments scheduled for today
              </div>
            ) : (
              todaysSchedule.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium w-16">
                      {new Date(appointment.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div>
                      <p className="font-medium">
                        {appointment.patient?.firstName} {appointment.patient?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {appointment.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                    <Badge
                      variant="outline"
                      className={
                        appointment.status === "completed"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-600" />
            Quick Care Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: "Record Vitals", href: "/vital-submission", icon: HeartPulse },
              { name: "Patient RPM", href: "/patient-rpm", icon: Activity },
              { name: "Diabetes Monitor", href: "/diabetes-rpm-dashboard", icon: TrendingUp },
              { name: "Send Message", href: "/ehr/messaging", icon: MessageCircle },
              { name: "Schedule", href: "/schedule", icon: Calendar },
              { name: "Family Portal", href: "/ehr/portal", icon: Users },
            ].map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => window.location.href = action.href}
              >
                <action.icon className="w-6 h-6" />
                <span className="text-xs">{action.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Care Notes & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Important Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading alerts...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active alerts
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 border rounded-lg ${
                    alert.severity === 'critical' || alert.severity === 'high'
                      ? 'bg-red-50 border-red-200'
                      : alert.severity === 'medium'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <p className={`text-sm font-medium ${
                    alert.severity === 'critical' || alert.severity === 'high'
                      ? 'text-red-800'
                      : alert.severity === 'medium'
                      ? 'text-yellow-800'
                      : 'text-blue-800'
                  }`}>
                    {alert.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Patient ID: {alert.patientId} • {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-600" />
              Recent Messages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-sm">Dr. Wilson</p>
                <span className="text-xs text-muted-foreground">10 min ago</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Please increase Eleanor's BP monitoring frequency today.
              </p>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-sm">Nurse Smith</p>
                <span className="text-xs text-muted-foreground">1 hour ago</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Great work on George's wound care documentation.
              </p>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-sm">Family (Patterson)</p>
                <span className="text-xs text-muted-foreground">2 hours ago</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Thank you for the update on mom's condition today.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
