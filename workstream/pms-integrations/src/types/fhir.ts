import { Resource } from 'fhir/r4';

// FHIR R4 Resource Types with USCDI v3 Extensions
export interface ExtendedPatient extends fhir4.Patient {
  birthDate: string; // Required for USCDI v3
  gender: 'male' | 'female' | 'other' | 'unknown'; // Required
  name: fhir4.HumanName[]; // Required
  identifier: fhir4.Identifier[]; // Required
  address?: fhir4.Address[]; // USCDI v3 Core
  telecom?: fhir4.ContactPoint[]; // USCDI v3 Core
  communication?: fhir4.PatientCommunication[]; // USCDI v3 Additional
  race?: fhir4.Extension; // USCDI v3 Additional
  ethnicity?: fhir4.Extension; // USCDI v3 Additional
  preferredLanguage?: fhir4.Extension; // USCDI v3 Additional
}

export interface ExtendedEncounter extends fhir4.Encounter {
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled';
  class: fhir4.Coding; // Required
  subject: fhir4.Reference; // Required patient reference
  participant?: fhir4.EncounterParticipant[]; // USCDI v3 Core
  period?: fhir4.Period; // USCDI v3 Core
  location?: fhir4.EncounterLocation[]; // USCDI v3 Additional
  diagnosis?: fhir4.EncounterDiagnosis[]; // USCDI v3 Additional
}

export interface ExtendedObservation extends fhir4.Observation {
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled';
  category?: fhir4.CodeableConcept[]; // USCDI v3 Core
  code: fhir4.CodeableConcept; // Required
  subject: fhir4.Reference; // Required patient reference
  effectiveDateTime?: string; // USCDI v3 Core
  valueQuantity?: fhir4.Quantity; // USCDI v3 Core
  valueCodeableConcept?: fhir4.CodeableConcept; // USCDI v3 Core
  valueString?: string; // USCDI v3 Core
  interpretation?: fhir4.CodeableConcept[]; // USCDI v3 Additional
  referenceRange?: fhir4.ObservationReferenceRange[]; // USCDI v3 Additional
}

export interface ExtendedCondition extends fhir4.Condition {
  subject: fhir4.Reference; // Required patient reference
  code?: fhir4.CodeableConcept; // USCDI v3 Core
  clinicalStatus?: fhir4.CodeableConcept; // USCDI v3 Core
  verificationStatus?: fhir4.CodeableConcept; // USCDI v3 Core
  category?: fhir4.CodeableConcept[]; // USCDI v3 Additional
  onsetDateTime?: string; // USCDI v3 Additional
}

export interface ExtendedProcedure extends fhir4.Procedure {
  status: 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'completed';
  code: fhir4.CodeableConcept; // Required
  subject: fhir4.Reference; // Required patient reference
  performedDateTime?: string; // USCDI v3 Core
  performer?: fhir4.ProcedurePerformer[]; // USCDI v3 Additional
}

export interface ExtendedMedicationRequest extends fhir4.MedicationRequest {
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft';
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  subject: fhir4.Reference; // Required patient reference
  medicationCodeableConcept?: fhir4.CodeableConcept; // USCDI v3 Core
  dosageInstruction?: fhir4.Dosage[]; // USCDI v3 Core
  requester?: fhir4.Reference; // USCDI v3 Additional
}

export interface ExtendedImmunization extends fhir4.Immunization {
  status: 'completed' | 'entered-in-error' | 'not-done';
  vaccineCode: fhir4.CodeableConcept; // Required
  patient: fhir4.Reference; // Required patient reference
  occurrenceDateTime?: string; // USCDI v3 Core
  performer?: fhir4.ImmunizationPerformer[]; // USCDI v3 Additional
}

export interface ExtendedAllergyIntolerance extends fhir4.AllergyIntolerance {
  patient: fhir4.Reference; // Required patient reference
  code?: fhir4.CodeableConcept; // USCDI v3 Core
  clinicalStatus?: fhir4.CodeableConcept; // USCDI v3 Core
  verificationStatus?: fhir4.CodeableConcept; // USCDI v3 Core
  type?: 'allergy' | 'intolerance'; // USCDI v3 Additional
  category?: ('food' | 'medication' | 'environment' | 'biologic')[]; // USCDI v3 Additional
  reaction?: fhir4.AllergyIntoleranceReaction[]; // USCDI v3 Additional
}

export interface ExtendedDiagnosticReport extends fhir4.DiagnosticReport {
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled';
  code: fhir4.CodeableConcept; // Required
  subject: fhir4.Reference; // Required patient reference
  effectiveDateTime?: string; // USCDI v3 Core
  result?: fhir4.Reference[]; // USCDI v3 Core
  performer?: fhir4.Reference[]; // USCDI v3 Additional
}

export interface ExtendedCoverage extends fhir4.Coverage {
  status: 'active' | 'cancelled' | 'draft' | 'entered-in-error';
  beneficiary: fhir4.Reference; // Required patient reference
  payor: fhir4.Reference[]; // Required
  class?: fhir4.CoverageClass[]; // USCDI v3 Core
  period?: fhir4.Period; // USCDI v3 Additional
}

// SMART on FHIR Types
export interface SmartLaunchContext {
  patient?: string;
  encounter?: string;
  location?: string;
  resource?: string;
  intent?: string;
  fhirServiceUrl: string;
  clientId: string;
  scope: string;
}

export interface SmartTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
  patient?: string;
  encounter?: string;
  refresh_token?: string;
}

// FHIR Bundle for batch operations
export interface FhirBundle extends fhir4.Bundle {
  type: 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset' | 'collection';
  entry?: fhir4.BundleEntry[];
  total?: number;
  link?: fhir4.BundleLink[];
}

// FHIR Search Parameters
export interface FhirSearchParams {
  _id?: string;
  _lastUpdated?: string;
  _tag?: string;
  _profile?: string;
  _security?: string;
  _text?: string;
  _content?: string;
  _list?: string;
  _has?: string;
  _type?: string;
  _include?: string[];
  _revinclude?: string[];
  _sort?: string;
  _count?: number;
  _offset?: number;
  _summary?: 'true' | 'text' | 'data' | 'count' | 'false';
  _elements?: string[];
  _contained?: string;
  _containedtyped?: string;
  [key: string]: any; // Resource-specific search parameters
}

// FHIR Operation Outcome
export interface FhirOperationOutcome extends fhir4.OperationOutcome {
  issue: fhir4.OperationOutcomeIssue[];
}

// FHIR Capability Statement
export interface FhirCapabilityStatement extends fhir4.CapabilityStatement {
  status: 'draft' | 'active' | 'retired' | 'unknown';
  kind: 'instance' | 'capability' | 'requirements';
  fhirVersion: string;
  format: string[];
  rest?: fhir4.CapabilityStatementRest[];
}

// USCDI v3 Data Classes
export interface USCDIDataClass {
  name: string;
  required: boolean;
  elements: USCDIDataElement[];
}

export interface USCDIDataElement {
  name: string;
  fhirResource: string;
  fhirElement: string;
  required: boolean;
  vocabulary?: string;
  notes?: string;
}

// Integration-specific types
export interface IntegrationMetadata {
  system: 'epic' | 'cerner' | 'allscripts' | 'nextgen' | 'athenahealth' | 'eclinicalworks';
  version: string;
  endpoint: string;
  authType: 'oauth2' | 'apikey' | 'certificate';
  capabilities: string[];
  lastSync?: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
}

export interface HealthcareStandard {
  name: string;
  version: string;
  url: string;
  compliance: 'full' | 'partial' | 'none';
  certificationDate?: string;
  expirationDate?: string;
}

export type ResourceType =
  | 'Patient'
  | 'Practitioner'
  | 'PractitionerRole'
  | 'Organization'
  | 'Location'
  | 'Encounter'
  | 'Observation'
  | 'Condition'
  | 'Procedure'
  | 'MedicationRequest'
  | 'Medication'
  | 'Immunization'
  | 'AllergyIntolerance'
  | 'DiagnosticReport'
  | 'DocumentReference'
  | 'Coverage'
  | 'Claim'
  | 'ExplanationOfBenefit'
  | 'Account'
  | 'Appointment'
  | 'Schedule'
  | 'Slot'
  | 'Task'
  | 'ServiceRequest'
  | 'CarePlan'
  | 'CareTeam'
  | 'Device'
  | 'Specimen'
  | 'Media'
  | 'Provenance'
  | 'AuditEvent';