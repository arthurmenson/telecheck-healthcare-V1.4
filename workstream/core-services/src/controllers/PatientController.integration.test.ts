import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../app';
import { Database } from '../database/Database';
import type { CreatePatient } from '../types/Patient';

describe('PatientController Integration Tests', () => {
  let db: Database;

  beforeAll(async () => {
    // Use in-memory database for testing
    db = new Database({ filename: ':memory:' });
    await db.waitForReady();
    await db.migrate();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await db.run('DELETE FROM patients');
  });

  describe('POST /api/patients', () => {
    it('should create a new patient', async () => {
      const patientData: CreatePatient = {
        identifier: 'P001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-05-15T00:00:00.000Z',
        gender: 'male',
        email: 'john.doe@example.com',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/patients')
        .send(patientData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.identifier).toBe('P001');
      expect(response.body.data.firstName).toBe('John');
      expect(response.body.data.id).toBeDefined();
    });

    it('should return 400 for invalid patient data', async () => {
      const invalidData = {
        identifier: '', // Invalid: empty identifier
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: 'invalid-date',
        gender: 'invalid-gender'
      };

      const response = await request(app)
        .post('/api/patients')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/patients/:id', () => {
    it('should get patient by ID', async () => {
      // First create a patient
      const patientData: CreatePatient = {
        identifier: 'P002',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '1985-08-20T00:00:00.000Z',
        gender: 'female'
      };

      const createResponse = await request(app)
        .post('/api/patients')
        .send(patientData)
        .expect(201);

      const patientId = createResponse.body.data.id;

      // Then get the patient
      const response = await request(app)
        .get(`/api/patients/${patientId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(patientId);
      expect(response.body.data.identifier).toBe('P002');
    });

    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .get('/api/patients/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('PATIENT_NOT_FOUND');
    });
  });

  describe('PUT /api/patients/:id', () => {
    it('should update patient', async () => {
      // First create a patient
      const patientData: CreatePatient = {
        identifier: 'P003',
        firstName: 'Bob',
        lastName: 'Johnson',
        dateOfBirth: '1992-03-10T00:00:00.000Z',
        gender: 'male'
      };

      const createResponse = await request(app)
        .post('/api/patients')
        .send(patientData)
        .expect(201);

      const patientId = createResponse.body.data.id;

      // Update the patient
      const updateData = {
        firstName: 'Robert',
        email: 'robert.johnson@example.com'
      };

      const response = await request(app)
        .put(`/api/patients/${patientId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Robert');
      expect(response.body.data.email).toBe('robert.johnson@example.com');
      expect(response.body.data.lastName).toBe('Johnson'); // Should remain unchanged
    });
  });

  describe('DELETE /api/patients/:id', () => {
    it('should delete patient', async () => {
      // First create a patient
      const patientData: CreatePatient = {
        identifier: 'P004',
        firstName: 'Alice',
        lastName: 'Wilson',
        dateOfBirth: '1988-12-05T00:00:00.000Z',
        gender: 'female'
      };

      const createResponse = await request(app)
        .post('/api/patients')
        .send(patientData)
        .expect(201);

      const patientId = createResponse.body.data.id;

      // Delete the patient
      await request(app)
        .delete(`/api/patients/${patientId}`)
        .expect(204);

      // Verify patient is deleted
      await request(app)
        .get(`/api/patients/${patientId}`)
        .expect(404);
    });
  });

  describe('GET /api/patients', () => {
    it('should list all patients', async () => {
      // Create multiple patients
      const patients: CreatePatient[] = [
        {
          identifier: 'P005',
          firstName: 'Patient',
          lastName: 'Five',
          dateOfBirth: '1990-01-01T00:00:00.000Z',
          gender: 'male'
        },
        {
          identifier: 'P006',
          firstName: 'Patient',
          lastName: 'Six',
          dateOfBirth: '1991-01-01T00:00:00.000Z',
          gender: 'female'
        }
      ];

      for (const patient of patients) {
        await request(app)
          .post('/api/patients')
          .send(patient)
          .expect(201);
      }

      // List all patients
      const response = await request(app)
        .get('/api/patients')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.count).toBeGreaterThanOrEqual(2);

      // Verify the specific patients we created exist
      const identifiers = response.body.data.map((p: any) => p.identifier);
      expect(identifiers).toContain('P005');
      expect(identifiers).toContain('P006');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});