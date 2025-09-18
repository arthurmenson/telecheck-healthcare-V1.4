import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Settings,
  Server,
  Database,
  Shield,
  Mail,
  Bell,
  Globe,
  Lock,
  Key,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Download,
  Upload,
  RefreshCw,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Zap,
  Brain,
  Heart,
  FileText,
  Calendar,
  Camera,
  Smartphone,
} from "lucide-react";

interface SystemConfig {
  general: {
    siteName: string;
    siteDescription: string;
    timezone: string;
    language: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    emailVerificationRequired: boolean;
    twoFactorRequired: boolean;
  };
  security: {
    sessionTimeout: number;
    passwordMinLength: number;
    passwordRequireSpecialChars: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireUppercase: boolean;
    maxLoginAttempts: number;
    lockoutDuration: number;
    enableAuditLog: boolean;
    requireSSL: boolean;
  };
  integrations: {
    enableFHIR: boolean;
    enableHL7: boolean;
    enableTelehealth: boolean;
    enableAI: boolean;
    enableNotifications: boolean;
    enableSMS: boolean;
    enableEmail: boolean;
    enableMobileApp: boolean;
  };
  performance: {
    cacheEnabled: boolean;
    cacheDuration: number;
    compressionEnabled: boolean;
    enableCDN: boolean;
    maxConcurrentUsers: number;
    apiRateLimit: number;
    backupFrequency: string;
    logRetentionDays: number;
  };
}

const defaultConfig: SystemConfig = {
  general: {
    siteName: "Telecheck Healthcare Platform",
    siteDescription: "AI-powered healthcare management system",
    timezone: "UTC",
    language: "en",
    maintenanceMode: false,
    registrationEnabled: true,
    emailVerificationRequired: true,
    twoFactorRequired: false,
  },
  security: {
    sessionTimeout: 30,
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    passwordRequireNumbers: true,
    passwordRequireUppercase: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    enableAuditLog: true,
    requireSSL: true,
  },
  integrations: {
    enableFHIR: true,
    enableHL7: true,
    enableTelehealth: true,
    enableAI: true,
    enableNotifications: true,
    enableSMS: true,
    enableEmail: true,
    enableMobileApp: true,
  },
  performance: {
    cacheEnabled: true,
    cacheDuration: 3600,
    compressionEnabled: true,
    enableCDN: true,
    maxConcurrentUsers: 1000,
    apiRateLimit: 100,
    backupFrequency: "daily",
    logRetentionDays: 90,
  },
};

const systemMetrics = {
  cpu: 45,
  memory: 68,
  disk: 72,
  network: 23,
  uptime: "15 days, 8 hours",
  activeUsers: 1247,
  totalSessions: 3892,
  apiCalls: 98432,
  errors: 12,
  warnings: 45,
};

export function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [activeTab, setActiveTab] = useState("general");
  const [isModified, setIsModified] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleConfigChange = (section: keyof SystemConfig, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setIsModified(true);
  };

  const handleSave = () => {
    console.log("Saving system configuration:", config);
    setIsModified(false);
    alert("System configuration saved successfully!");
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    setIsModified(false);
    alert("Configuration reset to defaults");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              System Settings
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configure system-wide settings and preferences
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} disabled={!isModified}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button onClick={handleSave} disabled={!isModified}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        {isModified && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium">Unsaved Changes</p>
                  <p className="text-sm text-muted-foreground">
                    You have unsaved configuration changes. Remember to save your changes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">CPU Usage</span>
                <Cpu className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold mb-1">{systemMetrics.cpu}%</div>
              <Progress value={systemMetrics.cpu} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Memory</span>
                <MemoryStick className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold mb-1">{systemMetrics.memory}%</div>
              <Progress value={systemMetrics.memory} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Disk Usage</span>
                <HardDrive className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold mb-1">{systemMetrics.disk}%</div>
              <Progress value={systemMetrics.disk} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Network</span>
                <Network className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold mb-1">{systemMetrics.network}%</div>
              <Progress value={systemMetrics.network} className="h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Configuration Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={config.general.siteName}
                      onChange={(e) => handleConfigChange("general", "siteName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={config.general.timezone}
                      onValueChange={(value) => handleConfigChange("general", "timezone", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Textarea
                    id="siteDescription"
                    value={config.general.siteDescription}
                    onChange={(e) => handleConfigChange("general", "siteDescription", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="maintenanceMode"
                      checked={config.general.maintenanceMode}
                      onCheckedChange={(checked) => handleConfigChange("general", "maintenanceMode", checked)}
                    />
                    <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="registrationEnabled"
                      checked={config.general.registrationEnabled}
                      onCheckedChange={(checked) => handleConfigChange("general", "registrationEnabled", checked)}
                    />
                    <Label htmlFor="registrationEnabled">User Registration</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="emailVerificationRequired"
                      checked={config.general.emailVerificationRequired}
                      onCheckedChange={(checked) => handleConfigChange("general", "emailVerificationRequired", checked)}
                    />
                    <Label htmlFor="emailVerificationRequired">Email Verification Required</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="twoFactorRequired"
                      checked={config.general.twoFactorRequired}
                      onCheckedChange={(checked) => handleConfigChange("general", "twoFactorRequired", checked)}
                    />
                    <Label htmlFor="twoFactorRequired">Require Two-Factor Auth</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={config.security.sessionTimeout}
                      onChange={(e) => handleConfigChange("security", "sessionTimeout", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={config.security.passwordMinLength}
                      onChange={(e) => handleConfigChange("security", "passwordMinLength", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={config.security.maxLoginAttempts}
                      onChange={(e) => handleConfigChange("security", "maxLoginAttempts", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                    <Input
                      id="lockoutDuration"
                      type="number"
                      value={config.security.lockoutDuration}
                      onChange={(e) => handleConfigChange("security", "lockoutDuration", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="passwordRequireSpecialChars"
                      checked={config.security.passwordRequireSpecialChars}
                      onCheckedChange={(checked) => handleConfigChange("security", "passwordRequireSpecialChars", checked)}
                    />
                    <Label htmlFor="passwordRequireSpecialChars">Require Special Characters</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="passwordRequireNumbers"
                      checked={config.security.passwordRequireNumbers}
                      onCheckedChange={(checked) => handleConfigChange("security", "passwordRequireNumbers", checked)}
                    />
                    <Label htmlFor="passwordRequireNumbers">Require Numbers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="passwordRequireUppercase"
                      checked={config.security.passwordRequireUppercase}
                      onCheckedChange={(checked) => handleConfigChange("security", "passwordRequireUppercase", checked)}
                    />
                    <Label htmlFor="passwordRequireUppercase">Require Uppercase</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableAuditLog"
                      checked={config.security.enableAuditLog}
                      onCheckedChange={(checked) => handleConfigChange("security", "enableAuditLog", checked)}
                    />
                    <Label htmlFor="enableAuditLog">Enable Audit Logging</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Settings */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(config.integrations).map(([key, value]) => {
                    const icons = {
                      enableFHIR: FileText,
                      enableHL7: Network,
                      enableTelehealth: Camera,
                      enableAI: Brain,
                      enableNotifications: Bell,
                      enableSMS: Smartphone,
                      enableEmail: Mail,
                      enableMobileApp: Smartphone,
                    };
                    const Icon = icons[key as keyof typeof icons] || Zap;

                    return (
                      <div key={key} className="p-4 border rounded-lg">
                        <div className="flex items-center space-x-3 mb-3">
                          <Icon className="w-5 h-5 text-primary" />
                          <h4 className="font-medium">
                            {key.replace('enable', '').replace(/([A-Z])/g, ' $1').trim()}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => handleConfigChange("integrations", key, checked)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {value ? "Enabled" : "Disabled"}
                          </span>
                          {value && <Badge className="bg-green-100 text-green-800">Active</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Settings */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cacheDuration">Cache Duration (seconds)</Label>
                    <Input
                      id="cacheDuration"
                      type="number"
                      value={config.performance.cacheDuration}
                      onChange={(e) => handleConfigChange("performance", "cacheDuration", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxConcurrentUsers">Max Concurrent Users</Label>
                    <Input
                      id="maxConcurrentUsers"
                      type="number"
                      value={config.performance.maxConcurrentUsers}
                      onChange={(e) => handleConfigChange("performance", "maxConcurrentUsers", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiRateLimit">API Rate Limit (per minute)</Label>
                    <Input
                      id="apiRateLimit"
                      type="number"
                      value={config.performance.apiRateLimit}
                      onChange={(e) => handleConfigChange("performance", "apiRateLimit", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logRetentionDays">Log Retention (days)</Label>
                    <Input
                      id="logRetentionDays"
                      type="number"
                      value={config.performance.logRetentionDays}
                      onChange={(e) => handleConfigChange("performance", "logRetentionDays", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">Backup Frequency</Label>
                  <Select
                    value={config.performance.backupFrequency}
                    onValueChange={(value) => handleConfigChange("performance", "backupFrequency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="cacheEnabled"
                      checked={config.performance.cacheEnabled}
                      onCheckedChange={(checked) => handleConfigChange("performance", "cacheEnabled", checked)}
                    />
                    <Label htmlFor="cacheEnabled">Enable Caching</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="compressionEnabled"
                      checked={config.performance.compressionEnabled}
                      onCheckedChange={(checked) => handleConfigChange("performance", "compressionEnabled", checked)}
                    />
                    <Label htmlFor="compressionEnabled">Enable Compression</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableCDN"
                      checked={config.performance.enableCDN}
                      onCheckedChange={(checked) => handleConfigChange("performance", "enableCDN", checked)}
                    />
                    <Label htmlFor="enableCDN">Enable CDN</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{systemMetrics.activeUsers}</div>
                    <div className="text-sm text-muted-foreground">Active Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{systemMetrics.totalSessions}</div>
                    <div className="text-sm text-muted-foreground">Total Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{systemMetrics.apiCalls}</div>
                    <div className="text-sm text-muted-foreground">API Calls</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{systemMetrics.uptime}</div>
                    <div className="text-sm text-muted-foreground">System Uptime</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}