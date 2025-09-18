#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { databaseConfig } from '../lib/config';
import { patients, providers, appointments, medicalRecords } from '../schema/healthcare';

async function seed() {
  const sql = postgres(databaseConfig.DATABASE_URL);
  const db = drizzle(sql);

  try {
    console.log('Starting database seeding...');

    console.log('Creating sample patients...');
    const [patient1, patient2] = await db.insert(patients).values([
      {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1985-03-15'),
        gender: 'male',
        email: 'john.doe@example.com',
        phone: '+1-555-0101',
        address: '123 Main Street',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+1-555-0102',
        insuranceProvider: 'Blue Cross Blue Shield',
        insurancePolicyNumber: 'BC123456789',
        isActive: true
      },
      {
        firstName: 'Alice',
        lastName: 'Johnson',
        dateOfBirth: new Date('1992-07-22'),
        gender: 'female',
        email: 'alice.johnson@example.com',
        phone: '+1-555-0201',
        address: '456 Oak Avenue',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62702',
        emergencyContactName: 'Bob Johnson',
        emergencyContactPhone: '+1-555-0202',
        insuranceProvider: 'Aetna',
        insurancePolicyNumber: 'AET987654321',
        isActive: true
      }
    ]).returning();

    console.log('Creating sample providers...');
    const [provider1, provider2] = await db.insert(providers).values([
      {
        firstName: 'Dr. Sarah',
        lastName: 'Smith',
        email: 'sarah.smith@hospital.com',
        phone: '+1-555-1001',
        specialization: 'Family Medicine',
        licenseNumber: 'MD123456',
        licenseExpiry: new Date('2025-12-31'),
        npiNumber: '1234567890',
        isActive: true
      },
      {
        firstName: 'Dr. Michael',
        lastName: 'Brown',
        email: 'michael.brown@hospital.com',
        phone: '+1-555-1002',
        specialization: 'Cardiology',
        licenseNumber: 'MD789012',
        licenseExpiry: new Date('2026-06-30'),
        npiNumber: '0987654321',
        isActive: true
      }
    ]).returning();

    console.log('Creating sample appointments...');
    await db.insert(appointments).values([
      {
        patientId: patient1.id,
        providerId: provider1.id,
        scheduledAt: new Date('2024-02-15T10:00:00Z'),
        duration: 30,
        appointmentType: 'routine_checkup',
        status: 'scheduled',
        notes: 'Annual physical examination'
      },
      {
        patientId: patient2.id,
        providerId: provider2.id,
        scheduledAt: new Date('2024-02-16T14:00:00Z'),
        duration: 45,
        appointmentType: 'consultation',
        status: 'scheduled',
        notes: 'Follow-up for chest pain'
      }
    ]);

    console.log('Creating sample medical records...');
    await db.insert(medicalRecords).values([
      {
        patientId: patient1.id,
        recordType: 'annual_physical',
        diagnosis: 'Healthy adult male',
        symptoms: 'No acute symptoms',
        treatment: 'Continue current lifestyle',
        medications: 'Multivitamin daily',
        allergies: 'No known allergies',
        vitals: {
          bloodPressure: '120/80',
          heartRate: 72,
          temperature: 98.6,
          weight: 175,
          height: 70
        },
        notes: 'Patient in good health, recommend annual follow-up'
      },
      {
        patientId: patient2.id,
        recordType: 'consultation',
        diagnosis: 'Atypical chest pain',
        symptoms: 'Intermittent chest discomfort, no radiation',
        treatment: 'Stress test ordered, lifestyle modifications',
        medications: 'Low-dose aspirin',
        allergies: 'Penicillin',
        vitals: {
          bloodPressure: '135/85',
          heartRate: 78,
          temperature: 98.4,
          weight: 145,
          height: 65
        },
        notes: 'EKG normal, stress test pending'
      }
    ]);

    console.log('✅ Database seeded successfully!');
    console.log('Created:');
    console.log('- 2 patients');
    console.log('- 2 providers');
    console.log('- 2 appointments');
    console.log('- 2 medical records');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

if (require.main === module) {
  seed().catch((error) => {
    console.error('Seeding script failed:', error);
    process.exit(1);
  });
}

export { seed };