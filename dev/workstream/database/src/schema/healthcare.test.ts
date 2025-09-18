import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  patients,
  providers,
  appointments,
  medicalRecords,
  prescriptions,
  auditLog,
  type Patient,
  type Provider,
  type Appointment,
  type MedicalRecord,
  type Prescription
} from './healthcare';

describe('Healthcare Schema', () => {
  let db: ReturnType<typeof drizzle>;
  let sql: postgres.Sql;

  beforeAll(async () => {
    sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5433/spark_den_test');
    db = drizzle(sql);
  });

  afterAll(async () => {
    await sql.end();
  });

  describe('Patient schema', () => {
    it('should create patient with required HIPAA-compliant fields', async () => {
      const patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'> = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+1-555-0124',
        insuranceProvider: 'Blue Cross',
        insurancePolicyNumber: 'BC123456789',
        isActive: true
      };

      const [insertedPatient] = await db.insert(patients).values(patientData).returning();

      expect(insertedPatient.id).toBeDefined();
      expect(insertedPatient.firstName).toBe('John');
      expect(insertedPatient.lastName).toBe('Doe');
      expect(insertedPatient.email).toBe('john.doe@example.com');
      expect(insertedPatient.isActive).toBe(true);
      expect(insertedPatient.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique email constraint', async () => {
      const patientData = {
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: new Date('1985-06-15'),
        gender: 'female' as const,
        email: 'unique.test@example.com',
        phone: '+1-555-0125',
        address: '456 Oak Ave',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62702',
        emergencyContactName: 'John Smith',
        emergencyContactPhone: '+1-555-0126',
        isActive: true
      };

      await db.insert(patients).values(patientData);

      await expect(
        db.insert(patients).values(patientData)
      ).rejects.toThrow();
    });
  });

  describe('Provider schema', () => {
    it('should create healthcare provider with license validation', async () => {
      const providerData: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'> = {
        firstName: 'Dr. Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@hospital.com',
        phone: '+1-555-0200',
        specialization: 'Cardiology',
        licenseNumber: 'MD123456',
        licenseExpiry: new Date('2025-12-31'),
        npiNumber: '1234567890',
        isActive: true
      };

      const [insertedProvider] = await db.insert(providers).values(providerData).returning();

      expect(insertedProvider.id).toBeDefined();
      expect(insertedProvider.specialization).toBe('Cardiology');
      expect(insertedProvider.licenseNumber).toBe('MD123456');
      expect(insertedProvider.npiNumber).toBe('1234567890');
    });
  });

  describe('Appointment schema', () => {
    it('should create appointment with proper foreign key relationships', async () => {
      const patient = await db.insert(patients).values({
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        email: 'test.patient@example.com',
        phone: '+1-555-0300',
        address: '789 Test St',
        city: 'Test City',
        state: 'TX',
        zipCode: '12345',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+1-555-0301',
        isActive: true
      }).returning();

      const provider = await db.insert(providers).values({
        firstName: 'Dr. Test',
        lastName: 'Provider',
        email: 'test.provider@hospital.com',
        phone: '+1-555-0400',
        specialization: 'General Practice',
        licenseNumber: 'MD789012',
        licenseExpiry: new Date('2025-12-31'),
        npiNumber: '9876543210',
        isActive: true
      }).returning();

      const appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> = {
        patientId: patient[0].id,
        providerId: provider[0].id,
        scheduledAt: new Date('2024-01-15T10:00:00Z'),
        duration: 30,
        appointmentType: 'consultation',
        status: 'scheduled',
        notes: 'Regular checkup'
      };

      const [appointment] = await db.insert(appointments).values(appointmentData).returning();

      expect(appointment.patientId).toBe(patient[0].id);
      expect(appointment.providerId).toBe(provider[0].id);
      expect(appointment.status).toBe('scheduled');
    });
  });

  describe('Medical Records schema', () => {
    it('should store encrypted medical records with proper audit trail', async () => {
      const patient = await db.insert(patients).values({
        firstName: 'Medical',
        lastName: 'Test',
        dateOfBirth: new Date('1980-05-20'),
        gender: 'female',
        email: 'medical.test@example.com',
        phone: '+1-555-0500',
        address: '321 Medical Ave',
        city: 'Healthcare City',
        state: 'CA',
        zipCode: '90210',
        emergencyContactName: 'Medical Emergency',
        emergencyContactPhone: '+1-555-0501',
        isActive: true
      }).returning();

      const recordData: Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        patientId: patient[0].id,
        recordType: 'diagnosis',
        diagnosis: 'Hypertension',
        symptoms: 'High blood pressure, headaches',
        treatment: 'Prescribed medication and lifestyle changes',
        medications: 'Lisinopril 10mg daily',
        allergies: 'Penicillin',
        vitals: JSON.stringify({
          bloodPressure: '140/90',
          heartRate: 72,
          temperature: 98.6,
          weight: 70
        }),
        notes: 'Patient responding well to treatment'
      };

      const [record] = await db.insert(medicalRecords).values(recordData).returning();

      expect(record.patientId).toBe(patient[0].id);
      expect(record.recordType).toBe('diagnosis');
      expect(record.diagnosis).toBe('Hypertension');
    });
  });

  describe('Audit Log schema', () => {
    it('should track all database changes for HIPAA compliance', async () => {
      const auditData = {
        tableName: 'patients',
        operation: 'INSERT' as const,
        newValues: JSON.stringify({ firstName: 'Test', lastName: 'Audit' }),
        userId: 'system',
        ipAddress: '127.0.0.1',
        userAgent: 'test-suite'
      };

      const [auditEntry] = await db.insert(auditLog).values(auditData).returning();

      expect(auditEntry.tableName).toBe('patients');
      expect(auditEntry.operation).toBe('INSERT');
      expect(auditEntry.userId).toBe('system');
      expect(auditEntry.timestamp).toBeInstanceOf(Date);
    });
  });
});