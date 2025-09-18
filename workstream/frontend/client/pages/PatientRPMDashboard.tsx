import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import { Alert, AlertDescription } from "../components/ui/alert";
import { useAuth } from "../contexts/AuthContext";
import {
  Activity,
  Heart,
  Thermometer,
  Weight,
  Droplets,
  Battery,
  CheckCircle,
  AlertTriangle,
  Camera,
  MessageSquare,
  Calendar,
  Pill,
  Target,
  TrendingUp,
  Smartphone,
  Wifi,
  Bell,
  Plus,
  Eye,
  Loader2,
} from "lucide-react";
import {
  usePatient,
  useVitalSigns,
  useMedications,
  useClinicalAlerts,
  useAppointments,
} from "../hooks/api/useClinical";

export function PatientRPMDashboard() {
  const { user } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState("glucose");

  // API Hooks
  const { data: patientData, isLoading: patientLoading } = usePatient(user?.id || '');
  const { data: vitalSigns, isLoading: vitalsLoading } = useVitalSigns(user?.id || '', {
    limit: 10,
    startDate: new Date().toISOString().split('T')[0],
  });
  const { data: medications, isLoading: medicationsLoading } = useMedications(user?.id || '');
  const { data: clinicalAlerts, isLoading: alertsLoading } = useClinicalAlerts({
    patientId: user?.id,
    status: 'active',
    limit: 5,
  });
  const { data: appointmentsData, isLoading: appointmentsLoading } = useAppointments({
    patientId: user?.id,
    limit: 5,
  });

  // Real data from API
  const patientInfo = patientData || user;
  const todaysVitals = vitalSigns || [];
  const activeMedications = medications || [];
  const alerts = clinicalAlerts || [];
  const upcomingAppointments = appointmentsData?.appointments || [];

  const deviceStatus = {
    glucose: { connected: true, battery: 78, lastReading: "2 min ago" },
    bloodPressure: { connected: true, battery: 92, lastReading: "1 hour ago" },
    weight: { connected: false, battery: 45, lastReading: "2 days ago" },
    temperature: { connected: true, battery: 88, lastReading: "30 min ago" }
  };

  // Transform vital signs data for display
  const getReadingsFromVitals = (vitals: any[]) => {
    const readings = [];

    vitals.forEach(vital => {
      if (vital.bloodPressure) {
        readings.push({
          type: "Blood Pressure",
          value: `${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} mmHg`,
          time: new Date(vital.measuredAt).toLocaleTimeString(),
          status: "normal",
          icon: Heart
        });
      }
      if (vital.heartRate) {
        readings.push({
          type: "Heart Rate",
          value: `${vital.heartRate} BPM`,
          time: new Date(vital.measuredAt).toLocaleTimeString(),
          status: "normal",
          icon: Heart
        });
      }
      if (vital.weight) {
        readings.push({
          type: "Weight",
          value: `${vital.weight} lbs`,
          time: new Date(vital.measuredAt).toLocaleTimeString(),
          status: "normal",
          icon: Weight
        });
      }
      if (vital.temperature) {
        readings.push({
          type: "Temperature",
          value: `${vital.temperature}°F`,
          time: new Date(vital.measuredAt).toLocaleTimeString(),
          status: "normal",
          icon: Thermometer
        });
      }
      if (vital.oxygenSaturation) {
        readings.push({
          type: "Oxygen Saturation",
          value: `${vital.oxygenSaturation}%`,
          time: new Date(vital.measuredAt).toLocaleTimeString(),
          status: "normal",
          icon: Activity
        });
      }
    });

    return readings;
  };

  const todaysReadings = getReadingsFromVitals(todaysVitals);


  const weeklyGoals = [
    { goal: "Take glucose readings 4x daily", current: 26, target: 28, percentage: 93 },
    { goal: "Take medications as prescribed", current: 13, target: 14, percentage: 93 },
    { goal: "Check blood pressure daily", current: 6, target: 7, percentage: 86 },
    { goal: "Maintain weight under 185 lbs", current: 1, target: 1, percentage: 100 }
  ];


  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Health Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {patientInfo?.firstName} {patientInfo?.lastName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="w-4 h-4 mr-1" />
              Connected
            </Badge>
            <Button>
              <MessageSquare className="w-4 h-4 mr-2" />
              Contact Care Team
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Latest Glucose</p>
                  <p className="text-2xl font-bold text-foreground">
                    {vitalsLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      todaysVitals.find(v => v.bloodPressure)?.bloodPressure?.systolic
                        ? `${todaysVitals.find(v => v.bloodPressure)?.bloodPressure?.systolic} mg/dL`
                        : 'No data'
                    )}
                  </p>
                  <p className="text-xs text-green-600">Latest reading</p>
                </div>
                <Droplets className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Blood Pressure</p>
                  <p className="text-2xl font-bold text-foreground">
                    {vitalsLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      todaysVitals.find(v => v.bloodPressure)
                        ? `${todaysVitals.find(v => v.bloodPressure)?.bloodPressure?.systolic}/${todaysVitals.find(v => v.bloodPressure)?.bloodPressure?.diastolic}`
                        : 'No data'
                    )}
                  </p>
                  <p className="text-xs text-green-600">Latest reading</p>
                </div>
                <Heart className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Weight</p>
                  <p className="text-2xl font-bold text-foreground">
                    {vitalsLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      todaysVitals.find(v => v.weight)
                        ? `${todaysVitals.find(v => v.weight)?.weight} lbs`
                        : 'No data'
                    )}
                  </p>
                  <p className="text-xs text-yellow-600">Latest reading</p>
                </div>
                <Weight className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Medications</p>
                  <p className="text-2xl font-bold text-foreground">
                    {medicationsLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      activeMedications.filter(m => m.isActive).length
                    )}
                  </p>
                  <p className="text-xs text-green-600">Current medications</p>
                </div>
                <Pill className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        {alertsLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading notifications...</span>
              </div>
            </CardContent>
          </Card>
        ) : alerts.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Health Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Alert key={alert.id} className={
                    alert.severity === "critical" || alert.severity === "high" ? "border-red-200 bg-red-50" :
                    alert.severity === "medium" ? "border-yellow-200 bg-yellow-50" :
                    "border-blue-200 bg-blue-50"
                  }>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <span>{alert.message}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Tabs defaultValue="readings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="readings">Today's Readings</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="devices">My Devices</TabsTrigger>
            <TabsTrigger value="goals">Weekly Goals</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          {/* Today's Readings */}
          <TabsContent value="readings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Today's Health Readings</CardTitle>
              </CardHeader>
              <CardContent>
                {vitalsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading readings...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {todaysReadings.length === 0 ? (
                      <div className="col-span-2 text-center py-8 text-muted-foreground">
                        No readings recorded today
                      </div>
                    ) : (
                      todaysReadings.map((reading, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <reading.icon className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-medium">{reading.type}</p>
                              <p className="text-2xl font-bold">{reading.value}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{reading.time}</p>
                            <Badge variant={reading.status === "normal" ? "secondary" : "destructive"}>
                              {reading.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                <div className="mt-6">
                  <Button className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Reading
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medications */}
          <TabsContent value="medications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Today's Medications</CardTitle>
              </CardHeader>
              <CardContent>
                {medicationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading medications...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeMedications.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No active medications
                      </div>
                    ) : (
                      activeMedications.map((med) => (
                        <div key={med.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Pill className={`w-5 h-5 ${med.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                            <div>
                              <p className="font-medium">{med.name}</p>
                              <p className="text-sm text-muted-foreground">{med.dosage}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">{med.frequency}</span>
                            <Badge className={med.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                              {med.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Devices */}
          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connected Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(deviceStatus).map(([device, status]) => (
                    <div key={device} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-5 h-5" />
                          <span className="font-medium capitalize">{device.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {status.connected ? (
                            <Wifi className="w-4 h-4 text-green-600" />
                          ) : (
                            <Wifi className="w-4 h-4 text-red-600" />
                          )}
                          <Badge variant={status.connected ? "secondary" : "destructive"}>
                            {status.connected ? "Connected" : "Offline"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Battery</span>
                          <div className="flex items-center gap-2">
                            <Progress value={status.battery} className="w-16 h-2" />
                            <span className="text-sm">{status.battery}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Last Reading</span>
                          <span className="text-sm">{status.lastReading}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals */}
          <TabsContent value="goals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Health Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {weeklyGoals.map((goal, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{goal.goal}</span>
                        <span className="text-sm text-muted-foreground">
                          {goal.current}/{goal.target}
                        </span>
                      </div>
                      <Progress value={goal.percentage} className="h-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Progress</span>
                        <span className="text-sm font-medium">{goal.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Health Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Trend Analysis</h3>
                  <p className="text-muted-foreground mb-4">
                    View your health data trends over time
                  </p>
                  <Button>View Detailed Trends</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Camera className="w-6 h-6" />
                <span className="text-sm">Photo Log</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <MessageSquare className="w-6 h-6" />
                <span className="text-sm">Message Care Team</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Calendar className="w-6 h-6" />
                <span className="text-sm">Schedule Visit</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Eye className="w-6 h-6" />
                <span className="text-sm">View Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
