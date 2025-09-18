#!/usr/bin/env tsx

import { Migrator } from '../workstream/database/src/lib/migrator';
import { databaseConfig } from '../workstream/database/src/lib/config';
import postgres from 'postgres';
import { readFile } from 'fs/promises';
import { join } from 'path';

class DatabaseSetup {
  private sql: postgres.Sql;
  private migrator: Migrator;

  constructor() {
    // Create database connection
    this.sql = postgres(databaseConfig.DATABASE_URL, {
      max: 1,
      onnotice: (notice) => console.log('NOTICE:', notice)
    });

    this.migrator = new Migrator(
      databaseConfig,
      join(__dirname, '../workstream/database/src/migrations')
    );
  }

  async waitForDatabase(maxRetries = 30, retryDelay = 2000): Promise<void> {
    console.log('🔍 Waiting for database to be available...');

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.sql`SELECT 1`;
        console.log('✅ Database is available!');
        return;
      } catch (error) {
        console.log(`⏳ Database not ready (attempt ${i + 1}/${maxRetries})`);
        if (i === maxRetries - 1) {
          throw new Error(`Database not available after ${maxRetries} attempts: ${error}`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async runMigrations(): Promise<void> {
    console.log('🔄 Running database migrations...');

    try {
      const appliedMigrations = await this.migrator.up();

      if (appliedMigrations.length === 0) {
        console.log('📦 No pending migrations found');
      } else {
        console.log(`✅ Applied ${appliedMigrations.length} migrations:`);
        appliedMigrations.forEach(id => console.log(`  - ${id}`));
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async seedDevelopmentData(): Promise<void> {
    console.log('🌱 Seeding development data...');

    try {
      // Check if data already exists
      const userCount = await this.sql`
        SELECT COUNT(*) as count FROM spark_den.providers
      `;

      if (parseInt(userCount[0].count) > 0) {
        console.log('📦 Development data already exists, skipping seed');
        return;
      }

      // Create development users
      await this.sql`
        INSERT INTO spark_den.providers (
          id,
          first_name,
          last_name,
          email,
          specialty,
          license_number,
          phone_number,
          address,
          created_at,
          updated_at
        ) VALUES
        (
          gen_random_uuid(),
          'Dr. John',
          'Smith',
          'john.smith@sparkden.com',
          'Internal Medicine',
          'MD123456',
          '+1-555-0101',
          '123 Medical Center Dr, Healthcare City, HC 12345',
          NOW(),
          NOW()
        ),
        (
          gen_random_uuid(),
          'Dr. Sarah',
          'Johnson',
          'sarah.johnson@sparkden.com',
          'Pediatrics',
          'MD789012',
          '+1-555-0102',
          '456 Children''s Hospital Way, Healthcare City, HC 12345',
          NOW(),
          NOW()
        ),
        (
          gen_random_uuid(),
          'Dr. Michael',
          'Brown',
          'michael.brown@sparkden.com',
          'Emergency Medicine',
          'MD345678',
          '+1-555-0103',
          '789 Emergency Blvd, Healthcare City, HC 12345',
          NOW(),
          NOW()
        )
      `;

      // Create development patients
      await this.sql`
        INSERT INTO spark_den.patients (
          id,
          first_name,
          last_name,
          date_of_birth,
          gender,
          ssn,
          email,
          phone_number,
          address,
          emergency_contact_name,
          emergency_contact_phone,
          insurance_provider,
          insurance_policy_number,
          medical_history,
          allergies,
          current_medications,
          created_at,
          updated_at
        ) VALUES
        (
          gen_random_uuid(),
          'Alice',
          'Williams',
          '1985-03-15',
          'female',
          '123-45-6789',
          'alice.williams@email.com',
          '+1-555-0201',
          '123 Main St, Anytown, ST 12345',
          'Bob Williams',
          '+1-555-0202',
          'HealthCare Plus',
          'HCP-123456789',
          '["Hypertension diagnosed 2020", "Annual checkups normal"]',
          '["Penicillin", "Shellfish"]',
          '["Lisinopril 10mg daily"]',
          NOW(),
          NOW()
        ),
        (
          gen_random_uuid(),
          'David',
          'Miller',
          '1978-11-22',
          'male',
          '987-65-4321',
          'david.miller@email.com',
          '+1-555-0203',
          '456 Oak Ave, Somewhere, ST 67890',
          'Mary Miller',
          '+1-555-0204',
          'MedCare Insurance',
          'MCI-987654321',
          '["Type 2 Diabetes diagnosed 2018", "No other significant history"]',
          '["None known"]',
          '["Metformin 500mg twice daily", "Glipizide 5mg daily"]',
          NOW(),
          NOW()
        ),
        (
          gen_random_uuid(),
          'Emma',
          'Davis',
          '1992-07-08',
          'female',
          '456-78-9012',
          'emma.davis@email.com',
          '+1-555-0205',
          '789 Pine St, Elsewhere, ST 13579',
          'James Davis',
          '+1-555-0206',
          'United Health',
          'UH-456789012',
          '["Asthma since childhood", "Well controlled"]',
          '["Dust mites", "Tree pollen"]',
          '["Albuterol inhaler as needed"]',
          NOW(),
          NOW()
        )
      `;

      // Create some development appointments
      const providers = await this.sql`
        SELECT id FROM spark_den.providers LIMIT 3
      `;

      const patients = await this.sql`
        SELECT id FROM spark_den.patients LIMIT 3
      `;

      await this.sql`
        INSERT INTO spark_den.appointments (
          id,
          patient_id,
          provider_id,
          appointment_date,
          appointment_time,
          duration_minutes,
          appointment_type,
          status,
          reason_for_visit,
          notes,
          created_at,
          updated_at
        ) VALUES
        (
          gen_random_uuid(),
          ${patients[0].id},
          ${providers[0].id},
          CURRENT_DATE + INTERVAL '1 day',
          '09:00:00',
          30,
          'routine_checkup',
          'scheduled',
          'Annual physical examination',
          'Patient requested early morning appointment',
          NOW(),
          NOW()
        ),
        (
          gen_random_uuid(),
          ${patients[1].id},
          ${providers[1].id},
          CURRENT_DATE + INTERVAL '2 days',
          '14:30:00',
          45,
          'consultation',
          'scheduled',
          'Diabetes management follow-up',
          'Review recent lab results and medication adjustments',
          NOW(),
          NOW()
        ),
        (
          gen_random_uuid(),
          ${patients[2].id},
          ${providers[2].id},
          CURRENT_DATE - INTERVAL '1 day',
          '11:15:00',
          20,
          'follow_up',
          'completed',
          'Asthma check-up',
          'Patient reports improved symptoms with current treatment',
          NOW(),
          NOW()
        )
      `;

      console.log('✅ Development data seeded successfully');
      console.log('   - 3 providers created');
      console.log('   - 3 patients created');
      console.log('   - 3 appointments created');

    } catch (error) {
      console.error('❌ Failed to seed development data:', error);
      throw error;
    }
  }

  async createDevelopmentUsers(): Promise<void> {
    console.log('👥 Creating development user accounts...');

    try {
      // This would integrate with auth service
      // For now, we'll create placeholder auth records
      await this.sql`
        CREATE TABLE IF NOT EXISTS spark_den.auth_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'user',
          provider_id UUID REFERENCES spark_den.providers(id),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Insert dev users (password is 'password123' hashed with bcrypt)
      await this.sql`
        INSERT INTO spark_den.auth_users (email, password_hash, role, provider_id)
        SELECT
          p.email,
          '$2b$10$rQJ5UaHW8Km1V.8i1j1JWuK0HJl9/xZFZoJ7sUGHGFsGJKGHMdU2m', -- password123
          'doctor',
          p.id
        FROM spark_den.providers p
        WHERE NOT EXISTS (
          SELECT 1 FROM spark_den.auth_users au WHERE au.email = p.email
        )
      `;

      // Create admin user
      await this.sql`
        INSERT INTO spark_den.auth_users (email, password_hash, role)
        VALUES ('admin@sparkden.com', '$2b$10$rQJ5UaHW8Km1V.8i1j1JWuK0HJl9/xZFZoJ7sUGHGFsGJKGHMdU2m', 'admin')
        ON CONFLICT (email) DO NOTHING
      `;

      console.log('✅ Development users created');
      console.log('   Login credentials:');
      console.log('   - admin@sparkden.com / password123 (admin)');
      console.log('   - john.smith@sparkden.com / password123 (doctor)');
      console.log('   - sarah.johnson@sparkden.com / password123 (doctor)');
      console.log('   - michael.brown@sparkden.com / password123 (doctor)');

    } catch (error) {
      console.error('❌ Failed to create development users:', error);
      throw error;
    }
  }

  async validateSetup(): Promise<void> {
    console.log('🔍 Validating database setup...');

    try {
      // Check table counts
      const results = await Promise.all([
        this.sql`SELECT COUNT(*) as count FROM spark_den.providers`,
        this.sql`SELECT COUNT(*) as count FROM spark_den.patients`,
        this.sql`SELECT COUNT(*) as count FROM spark_den.appointments`,
        this.sql`SELECT COUNT(*) as count FROM spark_den.auth_users`
      ]);

      const [providers, patients, appointments, users] = results;

      console.log('📊 Database statistics:');
      console.log(`   - Providers: ${providers[0].count}`);
      console.log(`   - Patients: ${patients[0].count}`);
      console.log(`   - Appointments: ${appointments[0].count}`);
      console.log(`   - Auth Users: ${users[0].count}`);

      // Check database health
      await this.sql`SELECT version()`;
      console.log('✅ Database setup validation completed');

    } catch (error) {
      console.error('❌ Database validation failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    await this.migrator.close();
    await this.sql.end();
  }

  async run(): Promise<void> {
    console.log('🚀 Starting database setup...');

    try {
      await this.waitForDatabase();
      await this.runMigrations();
      await this.seedDevelopmentData();
      await this.createDevelopmentUsers();
      await this.validateSetup();

      console.log('🎉 Database setup completed successfully!');
      console.log('');
      console.log('🔗 Connection Info:');
      console.log(`   Host: ${databaseConfig.DATABASE_HOST}`);
      console.log(`   Port: ${databaseConfig.DATABASE_PORT}`);
      console.log(`   Database: ${databaseConfig.DATABASE_NAME}`);
      console.log(`   URL: ${databaseConfig.DATABASE_URL}`);
      console.log('');
      console.log('🎯 Next Steps:');
      console.log('   1. Start the backend services: docker-compose up -d');
      console.log('   2. Access the frontend: http://localhost:5173');
      console.log('   3. Login with admin@sparkden.com / password123');

    } catch (error) {
      console.error('💥 Database setup failed:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Self-executing main function
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new DatabaseSetup();
  setup.run();
}