import type { Database } from './Database';
import type { Patient, CreatePatient, UpdatePatient } from '../types/Patient';
import { PatientSchema } from '../types/Patient';

interface PatientRow {
  id: string;
  identifier: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  email?: string;
  phone?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zipCode?: string;
  address_country?: string;
  emergencyContact_name?: string;
  emergencyContact_relationship?: string;
  emergencyContact_phone?: string;
  createdAt: string;
  updatedAt: string;
}

export class PatientRepository {
  constructor(private readonly db: Database) {}

  private mapRowToPatient(row: PatientRow): Patient {
    const patient: Patient = {
      id: row.id,
      identifier: row.identifier,
      firstName: row.firstName,
      lastName: row.lastName,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      email: row.email,
      phone: row.phone,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };

    if (row.address_street || row.address_city) {
      patient.address = {
        street: row.address_street || '',
        city: row.address_city || '',
        state: row.address_state || '',
        zipCode: row.address_zipCode || '',
        country: row.address_country || 'US'
      };
    }

    if (row.emergencyContact_name) {
      patient.emergencyContact = {
        name: row.emergencyContact_name,
        relationship: row.emergencyContact_relationship || '',
        phone: row.emergencyContact_phone || ''
      };
    }

    return PatientSchema.parse(patient);
  }

  private mapPatientToRow(patient: CreatePatient): Record<string, string | undefined> {
    const row: Record<string, string | undefined> = {
      identifier: patient.identifier,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      email: patient.email,
      phone: patient.phone
    };

    if (patient.address) {
      row.address_street = patient.address.street;
      row.address_city = patient.address.city;
      row.address_state = patient.address.state;
      row.address_zipCode = patient.address.zipCode;
      row.address_country = patient.address.country;
    }

    if (patient.emergencyContact) {
      row.emergencyContact_name = patient.emergencyContact.name;
      row.emergencyContact_relationship = patient.emergencyContact.relationship;
      row.emergencyContact_phone = patient.emergencyContact.phone;
    }

    return row;
  }

  async create(patient: CreatePatient & { id: string; createdAt: string; updatedAt: string }): Promise<Patient> {
    const row = this.mapPatientToRow(patient);

    const sql = `
      INSERT INTO patients (
        id, identifier, firstName, lastName, dateOfBirth, gender, email, phone,
        address_street, address_city, address_state, address_zipCode, address_country,
        emergencyContact_name, emergencyContact_relationship, emergencyContact_phone,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      patient.id,
      row.identifier,
      row.firstName,
      row.lastName,
      row.dateOfBirth,
      row.gender,
      row.email,
      row.phone,
      row.address_street,
      row.address_city,
      row.address_state,
      row.address_zipCode,
      row.address_country,
      row.emergencyContact_name,
      row.emergencyContact_relationship,
      row.emergencyContact_phone,
      patient.createdAt,
      patient.updatedAt
    ];

    await this.db.run(sql, params);
    const created = await this.findById(patient.id);

    if (!created) {
      throw new Error('Failed to create patient');
    }

    return created;
  }

  async findById(id: string): Promise<Patient | null> {
    const sql = 'SELECT * FROM patients WHERE id = ?';
    const row = await this.db.get<PatientRow>(sql, [id]);

    if (!row) {
      return null;
    }

    return this.mapRowToPatient(row);
  }

  async findByIdentifier(identifier: string): Promise<Patient | null> {
    const sql = 'SELECT * FROM patients WHERE identifier = ?';
    const row = await this.db.get<PatientRow>(sql, [identifier]);

    if (!row) {
      return null;
    }

    return this.mapRowToPatient(row);
  }

  async update(id: string, updates: UpdatePatient & { updatedAt: string }): Promise<Patient | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const merged = { ...existing, ...updates };
    const row = this.mapPatientToRow(merged as CreatePatient);

    const sql = `
      UPDATE patients SET
        identifier = ?, firstName = ?, lastName = ?, dateOfBirth = ?, gender = ?,
        email = ?, phone = ?, address_street = ?, address_city = ?, address_state = ?,
        address_zipCode = ?, address_country = ?, emergencyContact_name = ?,
        emergencyContact_relationship = ?, emergencyContact_phone = ?, updatedAt = ?
      WHERE id = ?
    `;

    const params = [
      row.identifier,
      row.firstName,
      row.lastName,
      row.dateOfBirth,
      row.gender,
      row.email,
      row.phone,
      row.address_street,
      row.address_city,
      row.address_state,
      row.address_zipCode,
      row.address_country,
      row.emergencyContact_name,
      row.emergencyContact_relationship,
      row.emergencyContact_phone,
      updates.updatedAt,
      id
    ];

    await this.db.run(sql, params);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM patients WHERE id = ?';
    const result = await this.db.run(sql, [id]);
    return result.changes > 0;
  }

  async findAll(limit = 100, offset = 0): Promise<Patient[]> {
    const sql = 'SELECT * FROM patients ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    const rows = await this.db.query<PatientRow>(sql, [limit, offset]);
    return rows.map(row => this.mapRowToPatient(row));
  }
}