import { ResourceType } from '../../types/fhir';

export class USCDIValidator {
  async validate(resource: any, resourceType: ResourceType): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // USCDI v3 validation rules
    switch (resourceType) {
      case 'Patient':
        // Required USCDI v3 elements
        if (!resource.name || resource.name.length === 0) {
          errors.push('USCDI v3: Patient name is required');
        }
        if (!resource.birthDate) {
          errors.push('USCDI v3: Patient birth date is required');
        }
        if (!resource.gender) {
          errors.push('USCDI v3: Patient gender is required');
        }
        break;

      case 'Observation':
        if (!resource.category) {
          errors.push('USCDI v3: Observation category is required');
        }
        if (!resource.effectiveDateTime && !resource.effectivePeriod) {
          errors.push('USCDI v3: Observation effective date/time is required');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async validateSearchResults(results: any, resourceType: ResourceType): Promise<void> {
    // Validate search results for USCDI compliance
    if (results.entry) {
      for (const entry of results.entry) {
        if (entry.resource) {
          const validation = await this.validate(entry.resource, resourceType);
          if (!validation.valid) {
            throw new Error(`USCDI validation failed: ${validation.errors.join(', ')}`);
          }
        }
      }
    }
  }
}