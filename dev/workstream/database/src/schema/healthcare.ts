import {
  pgTable,
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  boolean,
  integer,
  json,
  index,
  unique,
  foreignKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const sparkDenSchema = pgSchema('spark_den');
export const auditSchema = pgSchema('audit');

export const patients = sparkDenSchema.table('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  dateOfBirth: date('date_of_birth').notNull(),
  gender: varchar('gender', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  address: varchar('address', { length: 500 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 50 }).notNull(),
  zipCode: varchar('zip_code', { length: 20 }).notNull(),
  emergencyContactName: varchar('emergency_contact_name', { length: 200 }).notNull(),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }).notNull(),
  insuranceProvider: varchar('insurance_provider', { length: 200 }),
  insurancePolicyNumber: varchar('insurance_policy_number', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('patients_email_idx').on(table.email),
  lastNameIdx: index('patients_last_name_idx').on(table.lastName),
  dobIdx: index('patients_dob_idx').on(table.dateOfBirth),
}));

export const providers = sparkDenSchema.table('providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  specialization: varchar('specialization', { length: 200 }).notNull(),
  licenseNumber: varchar('license_number', { length: 50 }).notNull().unique(),
  licenseExpiry: date('license_expiry').notNull(),
  npiNumber: varchar('npi_number', { length: 10 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('providers_email_idx').on(table.email),
  licenseIdx: index('providers_license_idx').on(table.licenseNumber),
  npiIdx: index('providers_npi_idx').on(table.npiNumber),
  specializationIdx: index('providers_specialization_idx').on(table.specialization),
}));

export const appointments = sparkDenSchema.table('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull(),
  providerId: uuid('provider_id').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration').notNull(), // in minutes
  appointmentType: varchar('appointment_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('scheduled'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  patientFk: foreignKey({
    columns: [table.patientId],
    foreignColumns: [patients.id],
    name: 'appointments_patient_fk'
  }),
  providerFk: foreignKey({
    columns: [table.providerId],
    foreignColumns: [providers.id],
    name: 'appointments_provider_fk'
  }),
  patientIdx: index('appointments_patient_idx').on(table.patientId),
  providerIdx: index('appointments_provider_idx').on(table.providerId),
  scheduledAtIdx: index('appointments_scheduled_at_idx').on(table.scheduledAt),
  statusIdx: index('appointments_status_idx').on(table.status),
}));

export const medicalRecords = sparkDenSchema.table('medical_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull(),
  recordType: varchar('record_type', { length: 100 }).notNull(),
  diagnosis: text('diagnosis'),
  symptoms: text('symptoms'),
  treatment: text('treatment'),
  medications: text('medications'),
  allergies: text('allergies'),
  vitals: json('vitals'), // Structured data for vital signs
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  patientFk: foreignKey({
    columns: [table.patientId],
    foreignColumns: [patients.id],
    name: 'medical_records_patient_fk'
  }),
  patientIdx: index('medical_records_patient_idx').on(table.patientId),
  recordTypeIdx: index('medical_records_type_idx').on(table.recordType),
  createdAtIdx: index('medical_records_created_at_idx').on(table.createdAt),
}));

export const prescriptions = sparkDenSchema.table('prescriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull(),
  providerId: uuid('provider_id').notNull(),
  medicationName: varchar('medication_name', { length: 200 }).notNull(),
  dosage: varchar('dosage', { length: 100 }).notNull(),
  frequency: varchar('frequency', { length: 100 }).notNull(),
  duration: varchar('duration', { length: 100 }).notNull(),
  instructions: text('instructions'),
  refills: integer('refills').default(0),
  prescribedAt: timestamp('prescribed_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  patientFk: foreignKey({
    columns: [table.patientId],
    foreignColumns: [patients.id],
    name: 'prescriptions_patient_fk'
  }),
  providerFk: foreignKey({
    columns: [table.providerId],
    foreignColumns: [providers.id],
    name: 'prescriptions_provider_fk'
  }),
  patientIdx: index('prescriptions_patient_idx').on(table.patientId),
  providerIdx: index('prescriptions_provider_idx').on(table.providerId),
  statusIdx: index('prescriptions_status_idx').on(table.status),
  expiresAtIdx: index('prescriptions_expires_at_idx').on(table.expiresAt),
}));

export const users = sparkDenSchema.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('patient'),
  isEmailVerified: boolean('is_email_verified').default(false).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
  isActiveIdx: index('users_is_active_idx').on(table.isActive),
}));

export const emailVerificationTokens = sparkDenSchema.table('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 50 }).notNull(), // 'email_verification', 'password_reset', etc.
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'email_tokens_user_fk'
  }),
  tokenIdx: index('email_tokens_token_idx').on(table.token),
  userIdx: index('email_tokens_user_idx').on(table.userId),
  typeIdx: index('email_tokens_type_idx').on(table.type),
  expiresAtIdx: index('email_tokens_expires_at_idx').on(table.expiresAt),
}));

export const userSessions = sparkDenSchema.table('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  refreshToken: varchar('refresh_token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'sessions_user_fk'
  }),
  sessionTokenIdx: index('sessions_session_token_idx').on(table.sessionToken),
  refreshTokenIdx: index('sessions_refresh_token_idx').on(table.refreshToken),
  userIdx: index('sessions_user_idx').on(table.userId),
  expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
}));

export const auditLog = auditSchema.table('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  operation: varchar('operation', { length: 10 }).notNull(), // INSERT, UPDATE, DELETE
  oldValues: json('old_values'),
  newValues: json('new_values'),
  userId: varchar('user_id', { length: 100 }).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
}, (table) => ({
  tableNameIdx: index('audit_log_table_name_idx').on(table.tableName),
  timestampIdx: index('audit_log_timestamp_idx').on(table.timestamp),
  userIdx: index('audit_log_user_idx').on(table.userId),
  operationIdx: index('audit_log_operation_idx').on(table.operation),
}));

export const patientRelations = relations(patients, ({ many }) => ({
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
  prescriptions: many(prescriptions),
}));

export const providerRelations = relations(providers, ({ many }) => ({
  appointments: many(appointments),
  prescriptions: many(prescriptions),
}));

export const appointmentRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  provider: one(providers, {
    fields: [appointments.providerId],
    references: [providers.id],
  }),
}));

export const medicalRecordRelations = relations(medicalRecords, ({ one }) => ({
  patient: one(patients, {
    fields: [medicalRecords.patientId],
    references: [patients.id],
  }),
}));

export const prescriptionRelations = relations(prescriptions, ({ one }) => ({
  patient: one(patients, {
    fields: [prescriptions.patientId],
    references: [patients.id],
  }),
  provider: one(providers, {
    fields: [prescriptions.providerId],
    references: [providers.id],
  }),
}));

export const userRelations = relations(users, ({ many }) => ({
  emailVerificationTokens: many(emailVerificationTokens),
  userSessions: many(userSessions),
}));

export const emailVerificationTokenRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.userId],
    references: [users.id],
  }),
}));

export const userSessionRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type NewMedicalRecord = typeof medicalRecords.$inferInsert;

export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;