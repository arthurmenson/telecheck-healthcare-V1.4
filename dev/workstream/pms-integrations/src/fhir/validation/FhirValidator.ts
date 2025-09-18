import { ResourceType } from '../../types/fhir';

export class FhirValidator {
  async validate(resource: any, resourceType: ResourceType): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!resource.resourceType) {
      errors.push('Resource must have a resourceType');
    }

    if (resource.resourceType !== resourceType) {
      errors.push(`Expected resourceType ${resourceType}, got ${resource.resourceType}`);
    }

    // Resource-specific validation
    switch (resourceType) {
      case 'Patient':
        if (!resource.name || resource.name.length === 0) {
          errors.push('Patient must have at least one name');
        }
        if (!resource.gender) {
          errors.push('Patient must have a gender');
        }
        break;

      case 'Observation':
        if (!resource.status) {
          errors.push('Observation must have a status');
        }
        if (!resource.code) {
          errors.push('Observation must have a code');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}