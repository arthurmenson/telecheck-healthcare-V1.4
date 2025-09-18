import { v4 as uuidv4 } from 'uuid';
import { ExtendedPatient, FhirBundle, FhirSearchParams } from '../../types/fhir';
import { BaseProvider } from './BaseProvider';
import { logger } from '../../utils/logger';

export class PatientProvider extends BaseProvider<ExtendedPatient> {
  private patients: Map<string, ExtendedPatient> = new Map();

  constructor() {
    super('Patient');
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Create sample patients for testing USCDI v3 compliance
    const samplePatients: ExtendedPatient[] = [
      {
        resourceType: 'Patient',
        id: 'patient-1',
        meta: {
          versionId: '1',
          lastUpdated: new Date().toISOString(),
          profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient']
        },
        identifier: [
          {
            type: {
              coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                code: 'MR',
                display: 'Medical Record Number'
              }]
            },
            system: 'http://hospital.smarthealthit.org',
            value: 'MRN123456789'
          },
          {
            type: {
              coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                code: 'SS',
                display: 'Social Security Number'
              }]
            },
            system: 'http://hl7.org/fhir/sid/us-ssn',
            value: '999-99-9999'
          }
        ],
        name: [
          {
            use: 'official',
            family: 'Smith',
            given: ['John', 'Michael'],
            prefix: ['Mr.']
          }
        ],
        telecom: [
          {
            system: 'phone',
            value: '+1-555-123-4567',
            use: 'home'
          },
          {
            system: 'email',
            value: 'john.smith@example.com',
            use: 'home'
          }
        ],
        gender: 'male',
        birthDate: '1985-03-15',
        address: [
          {
            use: 'home',
            type: 'both',
            text: '123 Main Street, Anytown, ST 12345',
            line: ['123 Main Street'],
            city: 'Anytown',
            state: 'ST',
            postalCode: '12345',
            country: 'US'
          }
        ],
        maritalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
            code: 'M',
            display: 'Married'
          }]
        },
        communication: [
          {
            language: {
              coding: [{
                system: 'urn:ietf:bcp:47',
                code: 'en-US',
                display: 'English (United States)'
              }]
            },
            preferred: true
          }
        ],
        extension: [
          {
            // US Core Race Extension
            url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
            extension: [
              {
                url: 'ombCategory',
                valueCoding: {
                  system: 'urn:oid:2.16.840.1.113883.6.238',
                  code: '2106-3',
                  display: 'White'
                }
              },
              {
                url: 'text',
                valueString: 'White'
              }
            ]
          },
          {
            // US Core Ethnicity Extension
            url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
            extension: [
              {
                url: 'ombCategory',
                valueCoding: {
                  system: 'urn:oid:2.16.840.1.113883.6.238',
                  code: '2186-5',
                  display: 'Not Hispanic or Latino'
                }
              },
              {
                url: 'text',
                valueString: 'Not Hispanic or Latino'
              }
            ]
          },
          {
            // US Core Birth Sex Extension
            url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex',
            valueCode: 'M'
          }
        ]
      },
      {
        resourceType: 'Patient',
        id: 'patient-2',
        meta: {
          versionId: '1',
          lastUpdated: new Date().toISOString(),
          profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient']
        },
        identifier: [
          {
            type: {
              coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                code: 'MR',
                display: 'Medical Record Number'
              }]
            },
            system: 'http://hospital.smarthealthit.org',
            value: 'MRN987654321'
          }
        ],
        name: [
          {
            use: 'official',
            family: 'Johnson',
            given: ['Sarah', 'Elizabeth'],
            prefix: ['Ms.']
          }
        ],
        telecom: [
          {
            system: 'phone',
            value: '+1-555-987-6543',
            use: 'mobile'
          },
          {
            system: 'email',
            value: 'sarah.johnson@example.com',
            use: 'home'
          }
        ],
        gender: 'female',
        birthDate: '1992-07-22',
        address: [
          {
            use: 'home',
            type: 'both',
            text: '456 Oak Avenue, Another City, ST 54321',
            line: ['456 Oak Avenue'],
            city: 'Another City',
            state: 'ST',
            postalCode: '54321',
            country: 'US'
          }
        ],
        maritalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
            code: 'S',
            display: 'Single'
          }]
        },
        communication: [
          {
            language: {
              coding: [{
                system: 'urn:ietf:bcp:47',
                code: 'en-US',
                display: 'English (United States)'
              }]
            },
            preferred: true
          }
        ],
        extension: [
          {
            url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
            extension: [
              {
                url: 'ombCategory',
                valueCoding: {
                  system: 'urn:oid:2.16.840.1.113883.6.238',
                  code: '2054-5',
                  display: 'Black or African American'
                }
              },
              {
                url: 'text',
                valueString: 'Black or African American'
              }
            ]
          },
          {
            url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
            extension: [
              {
                url: 'ombCategory',
                valueCoding: {
                  system: 'urn:oid:2.16.840.1.113883.6.238',
                  code: '2186-5',
                  display: 'Not Hispanic or Latino'
                }
              },
              {
                url: 'text',
                valueString: 'Not Hispanic or Latino'
              }
            ]
          },
          {
            url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex',
            valueCode: 'F'
          }
        ]
      }
    ];

    samplePatients.forEach(patient => {
      this.patients.set(patient.id!, patient);
    });

    logger.info(`Initialized ${samplePatients.length} sample patients`);
  }

  async search(params: FhirSearchParams): Promise<FhirBundle> {
    logger.info('Searching patients with params:', params);

    let results = Array.from(this.patients.values());

    // Apply search filters
    if (params.identifier) {
      results = results.filter(patient =>
        patient.identifier?.some(id =>
          id.value?.toLowerCase().includes(params.identifier!.toLowerCase())
        )
      );
    }

    if (params.name) {
      const nameQuery = params.name.toLowerCase();
      results = results.filter(patient =>
        patient.name?.some(name =>
          name.family?.toLowerCase().includes(nameQuery) ||
          name.given?.some(given => given.toLowerCase().includes(nameQuery))
        )
      );
    }

    if (params.family) {
      results = results.filter(patient =>
        patient.name?.some(name =>
          name.family?.toLowerCase().includes(params.family!.toLowerCase())
        )
      );
    }

    if (params.given) {
      results = results.filter(patient =>
        patient.name?.some(name =>
          name.given?.some(given =>
            given.toLowerCase().includes(params.given!.toLowerCase())
          )
        )
      );
    }

    if (params.birthdate) {
      results = results.filter(patient =>
        patient.birthDate === params.birthdate
      );
    }

    if (params.gender) {
      results = results.filter(patient =>
        patient.gender === params.gender
      );
    }

    if (params._id) {
      results = results.filter(patient => patient.id === params._id);
    }

    // Apply pagination
    const count = params._count ? parseInt(params._count.toString()) : 20;
    const offset = params._offset ? parseInt(params._offset.toString()) : 0;
    const total = results.length;

    results = results.slice(offset, offset + count);

    return {
      resourceType: 'Bundle',
      id: uuidv4(),
      type: 'searchset',
      total,
      entry: results.map(patient => ({
        fullUrl: `Patient/${patient.id}`,
        resource: patient,
        search: { mode: 'match' }
      })),
      link: this.generateSearchLinks(params, total, count, offset)
    };
  }

  async read(id: string): Promise<ExtendedPatient | null> {
    logger.info(`Reading patient: ${id}`);
    return this.patients.get(id) || null;
  }

  async create(patient: ExtendedPatient): Promise<ExtendedPatient> {
    logger.info('Creating new patient');

    if (!patient.id) {
      patient.id = uuidv4();
    }

    // Ensure required USCDI v3 elements are present
    if (!patient.name || patient.name.length === 0) {
      throw new Error('Patient name is required for USCDI v3 compliance');
    }

    if (!patient.birthDate) {
      throw new Error('Patient birth date is required for USCDI v3 compliance');
    }

    if (!patient.gender) {
      throw new Error('Patient gender is required for USCDI v3 compliance');
    }

    patient.meta = {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient']
    };

    this.patients.set(patient.id, patient);
    return patient;
  }

  async update(id: string, patient: ExtendedPatient): Promise<ExtendedPatient> {
    logger.info(`Updating patient: ${id}`);

    const existing = this.patients.get(id);
    if (!existing) {
      throw new Error('Patient not found');
    }

    // Update version metadata
    const currentVersion = parseInt(existing.meta?.versionId || '1');
    patient.id = id;
    patient.meta = {
      versionId: (currentVersion + 1).toString(),
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient']
    };

    this.patients.set(id, patient);
    return patient;
  }

  async patch(id: string, patch: any): Promise<ExtendedPatient> {
    logger.info(`Patching patient: ${id}`);

    const existing = this.patients.get(id);
    if (!existing) {
      throw new Error('Patient not found');
    }

    // Apply JSON Patch operations
    const updated = { ...existing, ...patch };
    return this.update(id, updated);
  }

  async delete(id: string): Promise<void> {
    logger.info(`Deleting patient: ${id}`);

    if (!this.patients.has(id)) {
      throw new Error('Patient not found');
    }

    this.patients.delete(id);
  }

  async history(id: string): Promise<FhirBundle> {
    logger.info(`Getting patient history: ${id}`);

    const patient = this.patients.get(id);
    if (!patient) {
      throw new Error('Patient not found');
    }

    // In a real implementation, this would return all versions
    return {
      resourceType: 'Bundle',
      id: uuidv4(),
      type: 'history',
      total: 1,
      entry: [{
        fullUrl: `Patient/${patient.id}`,
        resource: patient,
        request: {
          method: 'GET',
          url: `Patient/${patient.id}/_history`
        }
      }]
    };
  }

  async vread(id: string, versionId: string): Promise<ExtendedPatient | null> {
    logger.info(`Reading patient version: ${id}/${versionId}`);

    const patient = this.patients.get(id);
    if (!patient || patient.meta?.versionId !== versionId) {
      return null;
    }

    return patient;
  }

  // Patient-specific operations
  async validatePatientIdentity(patient: ExtendedPatient): Promise<boolean> {
    // Implement patient identity validation logic
    // Check for required identifiers, names, etc.

    if (!patient.identifier || patient.identifier.length === 0) {
      return false;
    }

    if (!patient.name || patient.name.length === 0) {
      return false;
    }

    if (!patient.birthDate) {
      return false;
    }

    return true;
  }

  async searchByMRN(mrn: string): Promise<ExtendedPatient | null> {
    const results = Array.from(this.patients.values()).filter(patient =>
      patient.identifier?.some(id =>
        id.type?.coding?.some(coding => coding.code === 'MR') &&
        id.value === mrn
      )
    );

    return results.length > 0 ? results[0] : null;
  }

  async getPatientsByProvider(providerId: string): Promise<ExtendedPatient[]> {
    // In a real implementation, this would query by care provider relationships
    return Array.from(this.patients.values());
  }

  private generateSearchLinks(params: any, total: number, count: number, offset: number): any[] {
    const links: any[] = [];

    // Self link
    links.push({
      relation: 'self',
      url: `Patient?${new URLSearchParams(params).toString()}`
    });

    // First link
    if (offset > 0) {
      const firstParams = { ...params, _offset: 0 };
      links.push({
        relation: 'first',
        url: `Patient?${new URLSearchParams(firstParams).toString()}`
      });
    }

    // Previous link
    if (offset > 0) {
      const prevOffset = Math.max(0, offset - count);
      const prevParams = { ...params, _offset: prevOffset };
      links.push({
        relation: 'previous',
        url: `Patient?${new URLSearchParams(prevParams).toString()}`
      });
    }

    // Next link
    if (offset + count < total) {
      const nextParams = { ...params, _offset: offset + count };
      links.push({
        relation: 'next',
        url: `Patient?${new URLSearchParams(nextParams).toString()}`
      });
    }

    // Last link
    if (offset + count < total) {
      const lastOffset = Math.floor(total / count) * count;
      const lastParams = { ...params, _offset: lastOffset };
      links.push({
        relation: 'last',
        url: `Patient?${new URLSearchParams(lastParams).toString()}`
      });
    }

    return links;
  }
}