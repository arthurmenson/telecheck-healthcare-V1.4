-- Create healthcare domain tables

-- Patients table
CREATE TABLE spark_den.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    emergency_contact_name VARCHAR(200) NOT NULL,
    emergency_contact_phone VARCHAR(20) NOT NULL,
    insurance_provider VARCHAR(200),
    insurance_policy_number VARCHAR(100),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Providers table
CREATE TABLE spark_den.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    specialization VARCHAR(200) NOT NULL,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    license_expiry DATE NOT NULL,
    npi_number VARCHAR(10) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Appointments table
CREATE TABLE spark_den.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    provider_id UUID NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    duration INTEGER NOT NULL,
    appointment_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT appointments_patient_fk FOREIGN KEY (patient_id) REFERENCES spark_den.patients(id) ON DELETE CASCADE,
    CONSTRAINT appointments_provider_fk FOREIGN KEY (provider_id) REFERENCES spark_den.providers(id) ON DELETE CASCADE
);

-- Medical Records table
CREATE TABLE spark_den.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    record_type VARCHAR(100) NOT NULL,
    diagnosis TEXT,
    symptoms TEXT,
    treatment TEXT,
    medications TEXT,
    allergies TEXT,
    vitals JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT medical_records_patient_fk FOREIGN KEY (patient_id) REFERENCES spark_den.patients(id) ON DELETE CASCADE
);

-- Prescriptions table
CREATE TABLE spark_den.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    provider_id UUID NOT NULL,
    medication_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    instructions TEXT,
    refills INTEGER DEFAULT 0,
    prescribed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT prescriptions_patient_fk FOREIGN KEY (patient_id) REFERENCES spark_den.patients(id) ON DELETE CASCADE,
    CONSTRAINT prescriptions_provider_fk FOREIGN KEY (provider_id) REFERENCES spark_den.providers(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX patients_email_idx ON spark_den.patients(email);
CREATE INDEX patients_last_name_idx ON spark_den.patients(last_name);
CREATE INDEX patients_dob_idx ON spark_den.patients(date_of_birth);

CREATE INDEX providers_email_idx ON spark_den.providers(email);
CREATE INDEX providers_license_idx ON spark_den.providers(license_number);
CREATE INDEX providers_npi_idx ON spark_den.providers(npi_number);
CREATE INDEX providers_specialization_idx ON spark_den.providers(specialization);

CREATE INDEX appointments_patient_idx ON spark_den.appointments(patient_id);
CREATE INDEX appointments_provider_idx ON spark_den.appointments(provider_id);
CREATE INDEX appointments_scheduled_at_idx ON spark_den.appointments(scheduled_at);
CREATE INDEX appointments_status_idx ON spark_den.appointments(status);

CREATE INDEX medical_records_patient_idx ON spark_den.medical_records(patient_id);
CREATE INDEX medical_records_type_idx ON spark_den.medical_records(record_type);
CREATE INDEX medical_records_created_at_idx ON spark_den.medical_records(created_at);

CREATE INDEX prescriptions_patient_idx ON spark_den.prescriptions(patient_id);
CREATE INDEX prescriptions_provider_idx ON spark_den.prescriptions(provider_id);
CREATE INDEX prescriptions_status_idx ON spark_den.prescriptions(status);
CREATE INDEX prescriptions_expires_at_idx ON spark_den.prescriptions(expires_at);

-- Create audit triggers for HIPAA compliance
CREATE TRIGGER patients_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON spark_den.patients
    FOR EACH ROW EXECUTE FUNCTION audit.create_audit_trigger();

CREATE TRIGGER providers_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON spark_den.providers
    FOR EACH ROW EXECUTE FUNCTION audit.create_audit_trigger();

CREATE TRIGGER appointments_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON spark_den.appointments
    FOR EACH ROW EXECUTE FUNCTION audit.create_audit_trigger();

CREATE TRIGGER medical_records_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON spark_den.medical_records
    FOR EACH ROW EXECUTE FUNCTION audit.create_audit_trigger();

CREATE TRIGGER prescriptions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON spark_den.prescriptions
    FOR EACH ROW EXECUTE FUNCTION audit.create_audit_trigger();

-- ROLLBACK --

-- Drop audit triggers
DROP TRIGGER IF EXISTS prescriptions_audit_trigger ON spark_den.prescriptions;
DROP TRIGGER IF EXISTS medical_records_audit_trigger ON spark_den.medical_records;
DROP TRIGGER IF EXISTS appointments_audit_trigger ON spark_den.appointments;
DROP TRIGGER IF EXISTS providers_audit_trigger ON spark_den.providers;
DROP TRIGGER IF EXISTS patients_audit_trigger ON spark_den.patients;

-- Drop indexes
DROP INDEX IF EXISTS spark_den.prescriptions_expires_at_idx;
DROP INDEX IF EXISTS spark_den.prescriptions_status_idx;
DROP INDEX IF EXISTS spark_den.prescriptions_provider_idx;
DROP INDEX IF EXISTS spark_den.prescriptions_patient_idx;

DROP INDEX IF EXISTS spark_den.medical_records_created_at_idx;
DROP INDEX IF EXISTS spark_den.medical_records_type_idx;
DROP INDEX IF EXISTS spark_den.medical_records_patient_idx;

DROP INDEX IF EXISTS spark_den.appointments_status_idx;
DROP INDEX IF EXISTS spark_den.appointments_scheduled_at_idx;
DROP INDEX IF EXISTS spark_den.appointments_provider_idx;
DROP INDEX IF EXISTS spark_den.appointments_patient_idx;

DROP INDEX IF EXISTS spark_den.providers_specialization_idx;
DROP INDEX IF EXISTS spark_den.providers_npi_idx;
DROP INDEX IF EXISTS spark_den.providers_license_idx;
DROP INDEX IF EXISTS spark_den.providers_email_idx;

DROP INDEX IF EXISTS spark_den.patients_dob_idx;
DROP INDEX IF EXISTS spark_den.patients_last_name_idx;
DROP INDEX IF EXISTS spark_den.patients_email_idx;

-- Drop tables (foreign key constraints will be automatically dropped)
DROP TABLE IF EXISTS spark_den.prescriptions;
DROP TABLE IF EXISTS spark_den.medical_records;
DROP TABLE IF EXISTS spark_den.appointments;
DROP TABLE IF EXISTS spark_den.providers;
DROP TABLE IF EXISTS spark_den.patients;