import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, AdminUser, CreateUserRequest, UpdateUserRequest } from '../../services/admin.service';
import { toast } from '../../hooks/use-toast';

// Query Keys
export const ADMIN_QUERY_KEYS = {
  USERS: ['admin', 'users'],
  SYSTEM_METRICS: ['admin', 'system', 'metrics'],
  SYSTEM_ACTIVITIES: ['admin', 'system', 'activities'],
  SECURITY_ALERTS: ['admin', 'security', 'alerts'],
  PLATFORM_STATS: ['admin', 'platform', 'stats'],
  SYSTEM_HEALTH: ['admin', 'system', 'health'],
  SYSTEM_SETTINGS: ['admin', 'system', 'settings'],
  BACKUPS: ['admin', 'backups'],
} as const;

// User Management Hooks
export const useUsers = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.USERS, params],
    queryFn: () => adminService.getUsers(params),
    staleTime: 30000, // 30 seconds
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: CreateUserRequest) => adminService.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.USERS });
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.SYSTEM_METRICS });
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, userData }: { userId: string; userData: UpdateUserRequest }) =>
      adminService.updateUser(userId, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.USERS });
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.SYSTEM_METRICS });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.USERS });
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.SYSTEM_METRICS });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });
};

export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminService.toggleUserStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.USERS });
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.SYSTEM_METRICS });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    },
  });
};

export const useResetUserPassword = () => {
  return useMutation({
    mutationFn: (userId: string) => adminService.resetUserPassword(userId),
    onSuccess: (data) => {
      toast({
        title: "Password Reset",
        description: `Temporary password: ${data.temporaryPassword}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });
};

// System Metrics and Dashboard Hooks
export const useSystemMetrics = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.SYSTEM_METRICS,
    queryFn: () => adminService.getSystemMetrics(),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });
};

export const useSystemActivities = (params?: {
  limit?: number;
  severity?: string;
  type?: string;
}) => {
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.SYSTEM_ACTIVITIES, params],
    queryFn: () => adminService.getSystemActivities(params),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });
};

export const useSecurityAlerts = (params?: {
  limit?: number;
  severity?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.SECURITY_ALERTS, params],
    queryFn: () => adminService.getSecurityAlerts(params),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });
};

export const usePlatformStats = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.PLATFORM_STATS,
    queryFn: () => adminService.getPlatformStats(),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });
};

export const useSystemHealth = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.SYSTEM_HEALTH,
    queryFn: () => adminService.getSystemHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });
};

// System Settings Hooks
export const useSystemSettings = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.SYSTEM_SETTINGS,
    queryFn: () => adminService.getSystemSettings(),
    staleTime: 300000, // 5 minutes
  });
};

export const useUpdateSystemSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: any) => adminService.updateSystemSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.SYSTEM_SETTINGS });
      toast({
        title: "Success",
        description: "System settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update system settings",
        variant: "destructive",
      });
    },
  });
};

// Export/Import Hooks
export const useExportUsers = () => {
  return useMutation({
    mutationFn: (format: 'csv' | 'xlsx' = 'csv') => adminService.exportUsers(format),
    onSuccess: (data, format) => {
      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_export.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Users exported successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to export users",
        variant: "destructive",
      });
    },
  });
};

export const useImportUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => adminService.importUsers(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.USERS });
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.SYSTEM_METRICS });

      toast({
        title: "Import Complete",
        description: `${data.success} users imported successfully. ${data.failed} failed.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import users",
        variant: "destructive",
      });
    },
  });
};

// Backup Management Hooks
export const useBackups = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.BACKUPS,
    queryFn: () => adminService.getBackups(),
    staleTime: 60000, // 1 minute
  });
};

export const useCreateBackup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adminService.createBackup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.BACKUPS });
      toast({
        title: "Success",
        description: "Backup created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create backup",
        variant: "destructive",
      });
    },
  });
};

export const useDownloadBackup = () => {
  return useMutation({
    mutationFn: (backupId: string) => adminService.downloadBackup(backupId),
    onSuccess: (data, backupId) => {
      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${backupId}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Backup downloaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download backup",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteBackup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (backupId: string) => adminService.deleteBackup(backupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.BACKUPS });
      toast({
        title: "Success",
        description: "Backup deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete backup",
        variant: "destructive",
      });
    },
  });
};