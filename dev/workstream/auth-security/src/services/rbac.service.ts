import { UserRole, Permission, User } from '@/types/auth';

interface RolePermissions {
  [key: string]: string[];
}

interface ResourceActions {
  [resource: string]: string[];
}

export class RBACService {
  private rolePermissions: RolePermissions = {};
  private resourceActions: ResourceActions = {};

  constructor() {
    this.initializePermissions();
    this.initializeResourceActions();
  }

  private initializePermissions(): void {
    this.rolePermissions = {
      [UserRole.PATIENT]: [
        'read:own_profile',
        'update:own_profile',
        'read:own_appointments',
        'read:own_medical_records',
        'create:own_appointment_requests'
      ],
      [UserRole.NURSE]: [
        'read:patients',
        'update:patient_vitals',
        'read:appointments',
        'create:notes',
        'read:medical_records',
        'update:patient_status',
        'read:schedules'
      ],
      [UserRole.DOCTOR]: [
        'read:patients',
        'update:patients',
        'read:appointments',
        'create:appointments',
        'update:appointments',
        'delete:appointments',
        'create:prescriptions',
        'update:prescriptions',
        'read:medical_records',
        'create:medical_records',
        'update:medical_records',
        'read:schedules',
        'update:schedules'
      ],
      [UserRole.ADMIN]: [
        'read:all',
        'create:all',
        'update:all',
        'delete:all',
        'manage:users',
        'manage:roles',
        'read:audit_logs',
        'manage:system_settings'
      ]
    };
  }

  private initializeResourceActions(): void {
    this.resourceActions = {
      'profile': ['read', 'update'],
      'appointments': ['read', 'create', 'update', 'delete'],
      'patients': ['read', 'create', 'update', 'delete'],
      'medical_records': ['read', 'create', 'update', 'delete'],
      'prescriptions': ['read', 'create', 'update', 'delete'],
      'vitals': ['read', 'create', 'update'],
      'notes': ['read', 'create', 'update', 'delete'],
      'schedules': ['read', 'create', 'update', 'delete'],
      'users': ['read', 'create', 'update', 'delete'],
      'roles': ['read', 'create', 'update', 'delete'],
      'audit_logs': ['read'],
      'system_settings': ['read', 'update']
    };
  }

  hasPermission(user: User, resource: string, action: string, context?: Record<string, unknown>): boolean {
    const userPermissions = this.getUserPermissions(user.role);

    // Check for admin wildcard permissions
    if (userPermissions.includes('read:all') && action === 'read') return true;
    if (userPermissions.includes('create:all') && action === 'create') return true;
    if (userPermissions.includes('update:all') && action === 'update') return true;
    if (userPermissions.includes('delete:all') && action === 'delete') return true;

    // Check for specific permission
    const permission = `${action}:${resource}`;
    if (userPermissions.includes(permission)) {
      return this.checkContextualPermissions(user, resource, action, context);
    }

    // Check for own resource permissions
    const ownPermission = `${action}:own_${resource}`;
    if (userPermissions.includes(ownPermission)) {
      return this.checkOwnResourceAccess(user, context);
    }

    return false;
  }

  private checkContextualPermissions(
    user: User,
    resource: string,
    _action: string,
    _context?: Record<string, unknown>
  ): boolean {
    // Additional contextual checks can be implemented here
    // For example, checking if a doctor can only access patients assigned to them

    if (user.role === UserRole.DOCTOR && resource === 'patients') {
      // Doctors can access all patients for now
      // This could be enhanced to check assignments
      return true;
    }

    if (user.role === UserRole.NURSE && resource === 'patients') {
      // Nurses can access patients in their assigned units
      // This could be enhanced to check unit assignments
      return true;
    }

    return true;
  }

  private checkOwnResourceAccess(user: User, context?: Record<string, unknown>): boolean {
    if (!context) return false;

    // Check if the resource belongs to the user
    const userId = context['userId'] as string;
    const patientId = context['patientId'] as string;

    // For patients accessing their own resources
    if (user.role === UserRole.PATIENT) {
      return userId === user.id || patientId === user.id;
    }

    return false;
  }

  getUserPermissions(role: UserRole): string[] {
    return this.rolePermissions[role] || [];
  }

  getResourceActions(resource: string): string[] {
    return this.resourceActions[resource] || [];
  }

  createPermission(resource: string, action: string, conditions?: Record<string, unknown>): Permission {
    const permission: Permission = {
      id: `${action}:${resource}`,
      name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
      resource,
      action
    };
    if (conditions) {
      permission.conditions = conditions;
    }
    return permission;
  }

  canAccessEndpoint(user: User, endpoint: string, method: string): boolean {
    const endpointPermissions = this.getEndpointPermissions();
    const requiredPermission = endpointPermissions[`${method.toUpperCase()}:${endpoint}`];

    if (!requiredPermission) {
      return false; // Deny access if endpoint is not configured
    }

    const [action, resource] = requiredPermission.split(':');
    return this.hasPermission(user, resource, action);
  }

  private getEndpointPermissions(): Record<string, string> {
    return {
      'GET:/api/profile': 'read:own_profile',
      'PUT:/api/profile': 'update:own_profile',
      'GET:/api/appointments': 'read:appointments',
      'POST:/api/appointments': 'create:appointments',
      'PUT:/api/appointments/:id': 'update:appointments',
      'DELETE:/api/appointments/:id': 'delete:appointments',
      'GET:/api/patients': 'read:patients',
      'POST:/api/patients': 'create:patients',
      'PUT:/api/patients/:id': 'update:patients',
      'DELETE:/api/patients/:id': 'delete:patients',
      'GET:/api/medical-records': 'read:medical_records',
      'POST:/api/medical-records': 'create:medical_records',
      'PUT:/api/medical-records/:id': 'update:medical_records',
      'GET:/api/users': 'manage:users',
      'POST:/api/users': 'manage:users',
      'PUT:/api/users/:id': 'manage:users',
      'DELETE:/api/users/:id': 'manage:users',
      'GET:/api/audit-logs': 'read:audit_logs'
    };
  }
}