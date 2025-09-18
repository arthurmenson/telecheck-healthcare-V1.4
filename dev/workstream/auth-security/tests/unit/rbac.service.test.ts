import { RBACService } from '@/services/rbac.service';
import { User, UserRole } from '@/types/auth';

describe('RBACService', () => {
  let rbacService: RBACService;
  let patientUser: User;
  let nurseUser: User;
  let doctorUser: User;
  let adminUser: User;

  beforeEach(() => {
    rbacService = new RBACService();

    patientUser = {
      id: 'patient-1',
      email: 'patient@example.com',
      password: 'hashedpassword',
      role: UserRole.PATIENT,
      isActive: true,
      failedLoginAttempts: 0,
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    nurseUser = {
      id: 'nurse-1',
      email: 'nurse@example.com',
      password: 'hashedpassword',
      role: UserRole.NURSE,
      isActive: true,
      failedLoginAttempts: 0,
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    doctorUser = {
      id: 'doctor-1',
      email: 'doctor@example.com',
      password: 'hashedpassword',
      role: UserRole.DOCTOR,
      isActive: true,
      failedLoginAttempts: 0,
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    adminUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      password: 'hashedpassword',
      role: UserRole.ADMIN,
      isActive: true,
      failedLoginAttempts: 0,
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('hasPermission', () => {
    it('should allow patient to read own profile', () => {
      const result = rbacService.hasPermission(patientUser, 'profile', 'read', { userId: 'patient-1' });
      expect(result).toBe(true);
    });

    it('should deny patient access to other patient profile', () => {
      const result = rbacService.hasPermission(patientUser, 'profile', 'read', { userId: 'other-patient' });
      expect(result).toBe(false);
    });

    it('should allow nurse to read patients', () => {
      const result = rbacService.hasPermission(nurseUser, 'patients', 'read');
      expect(result).toBe(true);
    });

    it('should deny nurse ability to delete patients', () => {
      const result = rbacService.hasPermission(nurseUser, 'patients', 'delete');
      expect(result).toBe(false);
    });

    it('should allow doctor to create prescriptions', () => {
      const result = rbacService.hasPermission(doctorUser, 'prescriptions', 'create');
      expect(result).toBe(true);
    });

    it('should deny doctor access to manage users', () => {
      const result = rbacService.hasPermission(doctorUser, 'users', 'create');
      expect(result).toBe(false);
    });

    it('should allow admin to perform any action', () => {
      expect(rbacService.hasPermission(adminUser, 'users', 'read')).toBe(true);
      expect(rbacService.hasPermission(adminUser, 'patients', 'delete')).toBe(true);
      expect(rbacService.hasPermission(adminUser, 'audit_logs', 'read')).toBe(true);
    });
  });

  describe('getUserPermissions', () => {
    it('should return correct permissions for patient', () => {
      const permissions = rbacService.getUserPermissions(UserRole.PATIENT);
      expect(permissions).toContain('read:own_profile');
      expect(permissions).toContain('update:own_profile');
      expect(permissions).not.toContain('read:patients');
    });

    it('should return correct permissions for nurse', () => {
      const permissions = rbacService.getUserPermissions(UserRole.NURSE);
      expect(permissions).toContain('read:patients');
      expect(permissions).toContain('create:notes');
      expect(permissions).not.toContain('delete:patients');
    });

    it('should return correct permissions for doctor', () => {
      const permissions = rbacService.getUserPermissions(UserRole.DOCTOR);
      expect(permissions).toContain('create:prescriptions');
      expect(permissions).toContain('update:patients');
      expect(permissions).not.toContain('manage:users');
    });

    it('should return admin permissions for admin', () => {
      const permissions = rbacService.getUserPermissions(UserRole.ADMIN);
      expect(permissions).toContain('read:all');
      expect(permissions).toContain('manage:users');
      expect(permissions).toContain('read:audit_logs');
    });
  });

  describe('canAccessEndpoint', () => {
    it('should allow patient to access their profile endpoint', () => {
      const result = rbacService.canAccessEndpoint(patientUser, '/api/profile', 'GET');
      expect(result).toBe(true);
    });

    it('should deny patient access to users endpoint', () => {
      const result = rbacService.canAccessEndpoint(patientUser, '/api/users', 'GET');
      expect(result).toBe(false);
    });

    it('should allow nurse to access patients endpoint', () => {
      const result = rbacService.canAccessEndpoint(nurseUser, '/api/patients', 'GET');
      expect(result).toBe(true);
    });

    it('should deny nurse access to create patients', () => {
      const result = rbacService.canAccessEndpoint(nurseUser, '/api/patients', 'POST');
      expect(result).toBe(false);
    });

    it('should allow doctor to create appointments', () => {
      const result = rbacService.canAccessEndpoint(doctorUser, '/api/appointments', 'POST');
      expect(result).toBe(true);
    });

    it('should allow admin to access any endpoint', () => {
      expect(rbacService.canAccessEndpoint(adminUser, '/api/users', 'GET')).toBe(true);
      expect(rbacService.canAccessEndpoint(adminUser, '/api/audit-logs', 'GET')).toBe(true);
    });

    it('should deny access to unconfigured endpoints', () => {
      const result = rbacService.canAccessEndpoint(adminUser, '/api/unknown', 'GET');
      expect(result).toBe(false);
    });
  });

  describe('createPermission', () => {
    it('should create a permission object with correct properties', () => {
      const permission = rbacService.createPermission('patients', 'read');

      expect(permission.id).toBe('read:patients');
      expect(permission.name).toBe('Read patients');
      expect(permission.resource).toBe('patients');
      expect(permission.action).toBe('read');
    });

    it('should create a permission with conditions', () => {
      const conditions = { department: 'cardiology' };
      const permission = rbacService.createPermission('patients', 'read', conditions);

      expect(permission.conditions).toEqual(conditions);
    });
  });

  describe('getResourceActions', () => {
    it('should return available actions for a resource', () => {
      const actions = rbacService.getResourceActions('appointments');
      expect(actions).toContain('read');
      expect(actions).toContain('create');
      expect(actions).toContain('update');
      expect(actions).toContain('delete');
    });

    it('should return empty array for unknown resource', () => {
      const actions = rbacService.getResourceActions('unknown');
      expect(actions).toEqual([]);
    });
  });
});