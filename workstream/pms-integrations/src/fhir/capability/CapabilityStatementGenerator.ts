export class CapabilityStatementGenerator {
  async generate(): Promise<fhir4.CapabilityStatement> {
    return {
      resourceType: 'CapabilityStatement',
      id: 'spark-pms-fhir-server',
      url: 'http://localhost:8080/fhir/metadata',
      version: '1.0.0',
      name: 'SparkPMSFHIRServer',
      title: 'Spark PMS FHIR R4 Server',
      status: 'active',
      experimental: false,
      date: new Date().toISOString(),
      publisher: 'Spark PMS',
      description: 'FHIR R4 server with USCDI v3 compliance for healthcare integrations',
      kind: 'instance',
      software: {
        name: 'Spark PMS Integration Server',
        version: '1.0.0',
        releaseDate: new Date().toISOString()
      },
      implementation: {
        description: 'Spark PMS Healthcare Integration Platform',
        url: 'http://localhost:8080/fhir'
      },
      fhirVersion: '4.0.1',
      format: ['application/fhir+json', 'application/fhir+xml'],
      patchFormat: ['application/json-patch+json'],
      implementationGuide: [
        'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core'
      ],
      rest: [{
        mode: 'server',
        documentation: 'FHIR R4 Server with USCDI v3 support',
        security: {
          cors: true,
          service: [{
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/restful-security-service',
              code: 'SMART-on-FHIR',
              display: 'SMART on FHIR'
            }]
          }],
          description: 'SMART on FHIR OAuth 2.0 authorization'
        },
        resource: [
          {
            type: 'Patient',
            profile: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient',
            interaction: [
              { code: 'read' },
              { code: 'vread' },
              { code: 'update' },
              { code: 'patch' },
              { code: 'delete' },
              { code: 'history-instance' },
              { code: 'history-type' },
              { code: 'create' },
              { code: 'search-type' }
            ],
            versioning: 'versioned',
            readHistory: true,
            updateCreate: false,
            conditionalCreate: true,
            conditionalRead: 'modified-since',
            conditionalUpdate: true,
            conditionalDelete: 'single',
            searchInclude: ['*'],
            searchRevInclude: ['*'],
            searchParam: [
              { name: '_id', type: 'token' },
              { name: 'identifier', type: 'token' },
              { name: 'name', type: 'string' },
              { name: 'family', type: 'string' },
              { name: 'given', type: 'string' },
              { name: 'birthdate', type: 'date' },
              { name: 'gender', type: 'token' },
              { name: 'address', type: 'string' },
              { name: 'telecom', type: 'token' }
            ]
          },
          {
            type: 'Observation',
            profile: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab',
            interaction: [
              { code: 'read' },
              { code: 'vread' },
              { code: 'update' },
              { code: 'patch' },
              { code: 'delete' },
              { code: 'history-instance' },
              { code: 'history-type' },
              { code: 'create' },
              { code: 'search-type' }
            ],
            searchParam: [
              { name: '_id', type: 'token' },
              { name: 'patient', type: 'reference' },
              { name: 'code', type: 'token' },
              { name: 'category', type: 'token' },
              { name: 'date', type: 'date' },
              { name: 'status', type: 'token' },
              { name: 'value-quantity', type: 'quantity' }
            ]
          }
        ],
        interaction: [
          { code: 'transaction' },
          { code: 'batch' },
          { code: 'search-system' },
          { code: 'history-system' }
        ]
      }]
    };
  }
}