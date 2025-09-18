export interface FhirServerConfig {
  port: number;
  basePath: string;
  version: string;
  allowedOrigins: string[];
  uscdValidation: boolean;
  auth: {
    enabled: boolean;
    issuer: string;
    jwksUri: string;
    algorithms: string[];
    audience: string;
  };
}

export interface SmartAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationEndpoint: string;
  tokenEndpoint: string;
  introspectionEndpoint?: string;
  revocationEndpoint?: string;
}

export interface USCDIConfig {
  version: string;
  validationEnabled: boolean;
  requiredDataClasses: string[];
  optionalDataClasses: string[];
}

export const FHIR_R4_VERSION = '4.0.1';
export const USCDI_VERSION = 'v3';

export const DEFAULT_SCOPES = [
  'patient/Patient.read',
  'patient/Observation.read',
  'patient/Condition.read',
  'patient/Procedure.read',
  'patient/MedicationRequest.read',
  'patient/Immunization.read',
  'patient/AllergyIntolerance.read',
  'patient/DiagnosticReport.read',
  'patient/DocumentReference.read',
  'patient/Coverage.read',
  'patient/Encounter.read'
];

export const SYSTEM_SCOPES = [
  'system/Patient.read',
  'system/Patient.write',
  'system/Observation.read',
  'system/Observation.write',
  'system/Condition.read',
  'system/Condition.write',
  'system/Procedure.read',
  'system/Procedure.write',
  'system/MedicationRequest.read',
  'system/MedicationRequest.write',
  'system/Immunization.read',
  'system/Immunization.write',
  'system/AllergyIntolerance.read',
  'system/AllergyIntolerance.write',
  'system/DiagnosticReport.read',
  'system/DiagnosticReport.write',
  'system/DocumentReference.read',
  'system/DocumentReference.write',
  'system/Coverage.read',
  'system/Coverage.write',
  'system/Encounter.read',
  'system/Encounter.write'
];

export const USCDI_V3_DATA_CLASSES = {
  required: [
    'Patient Demographics',
    'Patient Summary',
    'Encounters',
    'Assessment and Plan of Treatment',
    'Health Concerns',
    'Care Goals',
    'Problems',
    'Procedures',
    'Medications',
    'Allergies and Intolerances',
    'Immunizations',
    'Laboratory',
    'Vital Signs',
    'Smoking Status',
    'Clinical Notes'
  ],
  additional: [
    'Diagnostic Imaging',
    'Provenance',
    'Patient Documents',
    'Device Use Statement',
    'Care Team Member(s)',
    'Clinical Trial Information',
    'Insurance Information',
    'Preferred Language',
    'Sex (Assigned at Birth)',
    'Sexual Orientation',
    'Gender Identity',
    'Disability Status',
    'Mental/Cognitive Status'
  ]
};

export const FHIR_MIME_TYPES = {
  JSON: 'application/fhir+json',
  XML: 'application/fhir+xml',
  PLAIN_JSON: 'application/json',
  PLAIN_XML: 'application/xml'
};

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503
};

export const FHIR_SEARCH_PARAMETERS = {
  GENERAL: [
    '_id',
    '_lastUpdated',
    '_tag',
    '_profile',
    '_security',
    '_text',
    '_content',
    '_list',
    '_has',
    '_type',
    '_include',
    '_revinclude',
    '_sort',
    '_count',
    '_offset',
    '_summary',
    '_elements',
    '_contained',
    '_containedtyped'
  ],
  PATIENT: [
    'identifier',
    'name',
    'family',
    'given',
    'birthdate',
    'gender',
    'address',
    'telecom',
    'email',
    'phone',
    'deceased',
    'organization'
  ],
  ENCOUNTER: [
    'patient',
    'subject',
    'date',
    'status',
    'class',
    'type',
    'participant',
    'location',
    'diagnosis'
  ],
  OBSERVATION: [
    'patient',
    'subject',
    'code',
    'category',
    'date',
    'value-quantity',
    'value-concept',
    'value-string',
    'status'
  ]
};

export const SMART_WELL_KNOWN_CONFIG = {
  authorization_endpoint: '/oauth/authorize',
  token_endpoint: '/oauth/token',
  token_endpoint_auth_methods_supported: [
    'client_secret_basic',
    'client_secret_post'
  ],
  registration_endpoint: '/oauth/register',
  scopes_supported: [...DEFAULT_SCOPES, ...SYSTEM_SCOPES],
  response_types_supported: ['code'],
  management_endpoint: '/oauth/manage',
  introspection_endpoint: '/oauth/introspect',
  revocation_endpoint: '/oauth/revoke',
  capabilities: [
    'launch-ehr',
    'launch-standalone',
    'client-public',
    'client-confidential-symmetric',
    'context-banner',
    'context-style',
    'context-ehr-patient',
    'context-ehr-encounter',
    'sso-openid-connect',
    'context-standalone-patient',
    'permission-offline',
    'permission-patient',
    'permission-user'
  ]
};