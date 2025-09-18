import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { useAuth } from "../contexts/AuthContext";
import {
  HeartPulse,
  Users,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  MessageCircle,
  Calendar,
  Bell,
  Stethoscope,
  UserCheck,
  Loader2,
} from "lucide-react";
import {
  useDashboardMetrics,
  useClinicalAlerts,
  usePatients,
  useProviderSchedule,
} from "../hooks/api/useClinical";

export function NurseDashboard() {
  const { user } = useAuth();

  // API Hooks
  const { data: dashboardMetrics, isLoading: metricsLoading } = useDashboardMetrics(user?.id);
  const { data: clinicalAlerts, isLoading: alertsLoading } = useClinicalAlerts({
    severity: 'high',
    status: 'active',
    limit: 5,
  });
  const { data: patientsData, isLoading: patientsLoading } = usePatients({
    assignedTo: user?.id,
    limit: 10,
  });
  const { data: scheduleData, isLoading: scheduleLoading } = useProviderSchedule(
    user?.id || '',
    new Date().toISOString().split('T')[0]
  );

  // Real data from API
  const criticalAlerts = clinicalAlerts || [];
  const todaysSchedule = scheduleData || [];
  const assignedPatients = patientsData?.patients || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nurse Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <UserCheck className="w-4 h-4 mr-1" />
            On Duty
          </Badge>
          <Button variant="outline" size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Patients</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patientsLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                assignedPatients.length
              )}
            </div>
            <p className="text-xs text-muted-foreground">Assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {alertsLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                criticalAlerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high').length
              )}
            </div>
            <p className="text-xs text-muted-foreground">Immediate attention needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Complete</CardTitle>
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
            <CardTitle className="text-sm font-medium">RPM Readings</CardTitle>
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
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Critical Patient Alerts
            </CardTitle>
            <CardDescription>
              Patients requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alertsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading alerts...</span>
              </div>
            ) : criticalAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No critical alerts
              </div>
            ) : (
              criticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        alert.severity === "critical" || alert.severity === "high"
                          ? "bg-red-500"
                          : alert.severity === "medium"
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <div>
                      <p className="font-medium">Patient ID: {alert.patientId}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.type.replace('-', ' ').toUpperCase()} - {alert.message}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleTimeString()}
                    </p>
                    <Button size="sm" variant="outline">
                      Review
                    </Button>
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
              <Calendar className="w-5 h-5 text-blue-600" />
              Today's Schedule
            </CardTitle>
            <CardDescription>
              Upcoming patient care activities
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
                      <p className="text-sm text-muted-foreground">
                        {appointment.reason}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {appointment.type}
                  </Badge>
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
            <Stethoscope className="w-5 h-5 text-purple-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: "Patient Care", href: "/ehr/intake", icon: Users },
              { name: "RPM Center", href: "/rpm-command-center", icon: Activity },
              { name: "CCM Workflow", href: "/ccm-workflow", icon: HeartPulse },
              { name: "Vital Entry", href: "/vital-submission", icon: Activity },
              { name: "Messages", href: "/ehr/messaging", icon: MessageCircle },
              { name: "Clinical Tools", href: "/ehr/clinical-tools", icon: Stethoscope },
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
    </div>
  );
}
