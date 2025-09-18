import { v4 as uuidv4 } from 'uuid';
import { FhirBundle, FhirSearchParams, ResourceType } from '../../types/fhir';
import { logger } from '../../utils/logger';

export abstract class BaseProvider<T extends fhir4.Resource> {
  protected resourceType: ResourceType;

  constructor(resourceType: ResourceType) {
    this.resourceType = resourceType;
  }

  // Abstract methods that must be implemented by concrete providers
  abstract search(params: FhirSearchParams): Promise<FhirBundle>;
  abstract read(id: string): Promise<T | null>;
  abstract create(resource: T): Promise<T>;
  abstract update(id: string, resource: T): Promise<T>;
  abstract patch(id: string, patch: any): Promise<T>;
  abstract delete(id: string): Promise<void>;
  abstract history(id: string): Promise<FhirBundle>;
  abstract vread(id: string, versionId: string): Promise<T | null>;

  // Common utility methods
  protected validateId(id: string): boolean {
    return /^[A-Za-z0-9\-\.]{1,64}$/.test(id);
  }

  protected generateId(): string {
    return uuidv4();
  }

  protected createMeta(versionId: string = '1'): fhir4.Meta {
    return {
      versionId,
      lastUpdated: new Date().toISOString()
    };
  }

  protected validateResource(resource: T): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic FHIR validation
    if (!resource.resourceType) {
      errors.push('Resource must have a resourceType');
    }

    if (resource.resourceType !== this.resourceType) {
      errors.push(`Resource type must be ${this.resourceType}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  protected applySearchSort(resources: T[], sortParam?: string): T[] {
    if (!sortParam) {
      return resources;
    }

    const sortFields = sortParam.split(',');

    return resources.sort((a, b) => {
      for (const field of sortFields) {
        const [fieldName, direction] = field.trim().startsWith('-')
          ? [field.trim().substring(1), 'desc']
          : [field.trim(), 'asc'];

        const aValue = this.getFieldValue(a, fieldName);
        const bValue = this.getFieldValue(b, fieldName);

        if (aValue !== bValue) {
          const comparison = this.compareValues(aValue, bValue);
          return direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  private getFieldValue(resource: T, fieldName: string): any {
    // Handle nested field access (e.g., 'name.family')
    const parts = fieldName.split('.');
    let value: any = resource;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }

      if (Array.isArray(value)) {
        // For arrays, get the first element
        value = value[0];
      }

      value = value[part];
    }

    return value;
  }

  private compareValues(a: any, b: any): number {
    if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
    if (b === null || b === undefined) return 1;

    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }

    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    // Convert to strings for comparison
    return String(a).localeCompare(String(b));
  }

  protected applySearchIncludes(
    bundle: FhirBundle,
    includes: string[],
    revIncludes: string[]
  ): Promise<FhirBundle> {
    // This is a simplified implementation
    // In a real system, this would resolve references and include related resources
    return Promise.resolve(bundle);
  }

  protected createSearchBundle(
    resources: T[],
    total: number,
    params: FhirSearchParams
  ): FhirBundle {
    return {
      resourceType: 'Bundle',
      id: uuidv4(),
      type: 'searchset',
      total,
      entry: resources.map(resource => ({
        fullUrl: `${this.resourceType}/${resource.id}`,
        resource,
        search: { mode: 'match' }
      })),
      link: this.generateSearchLinks(params, total)
    };
  }

  private generateSearchLinks(params: FhirSearchParams, total: number): fhir4.BundleLink[] {
    const links: fhir4.BundleLink[] = [];
    const count = params._count || 20;
    const offset = params._offset || 0;

    // Self link
    const selfParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => selfParams.append(key, String(v)));
        } else {
          selfParams.append(key, String(value));
        }
      }
    });

    links.push({
      relation: 'self',
      url: `${this.resourceType}?${selfParams.toString()}`
    });

    // First link
    if (offset > 0) {
      const firstParams = new URLSearchParams(selfParams);
      firstParams.set('_offset', '0');
      links.push({
        relation: 'first',
        url: `${this.resourceType}?${firstParams.toString()}`
      });
    }

    // Previous link
    if (offset > 0) {
      const prevOffset = Math.max(0, offset - count);
      const prevParams = new URLSearchParams(selfParams);
      prevParams.set('_offset', prevOffset.toString());
      links.push({
        relation: 'previous',
        url: `${this.resourceType}?${prevParams.toString()}`
      });
    }

    // Next link
    if (offset + count < total) {
      const nextParams = new URLSearchParams(selfParams);
      nextParams.set('_offset', (offset + count).toString());
      links.push({
        relation: 'next',
        url: `${this.resourceType}?${nextParams.toString()}`
      });
    }

    // Last link
    if (offset + count < total) {
      const lastOffset = Math.floor((total - 1) / count) * count;
      const lastParams = new URLSearchParams(selfParams);
      lastParams.set('_offset', lastOffset.toString());
      links.push({
        relation: 'last',
        url: `${this.resourceType}?${lastParams.toString()}`
      });
    }

    return links;
  }

  protected logOperation(operation: string, resourceId?: string): void {
    logger.info(`${this.resourceType} ${operation}${resourceId ? ` - ID: ${resourceId}` : ''}`);
  }

  // Common search parameter handlers
  protected filterByLastUpdated(resources: T[], lastUpdated?: string): T[] {
    if (!lastUpdated) return resources;

    try {
      const [operator, dateValue] = this.parseComparisonParam(lastUpdated);
      const targetDate = new Date(dateValue);

      return resources.filter(resource => {
        if (!resource.meta?.lastUpdated) return false;

        const resourceDate = new Date(resource.meta.lastUpdated);
        switch (operator) {
          case 'eq':
            return resourceDate.getTime() === targetDate.getTime();
          case 'ne':
            return resourceDate.getTime() !== targetDate.getTime();
          case 'gt':
            return resourceDate.getTime() > targetDate.getTime();
          case 'ge':
            return resourceDate.getTime() >= targetDate.getTime();
          case 'lt':
            return resourceDate.getTime() < targetDate.getTime();
          case 'le':
            return resourceDate.getTime() <= targetDate.getTime();
          default:
            return resourceDate.getTime() === targetDate.getTime();
        }
      });
    } catch (error) {
      logger.warn(`Invalid _lastUpdated parameter: ${lastUpdated}`);
      return resources;
    }
  }

  protected filterByTag(resources: T[], tag?: string): T[] {
    if (!tag) return resources;

    return resources.filter(resource =>
      resource.meta?.tag?.some(t =>
        t.code === tag || t.display === tag || t.system === tag
      )
    );
  }

  protected filterByProfile(resources: T[], profile?: string): T[] {
    if (!profile) return resources;

    return resources.filter(resource =>
      resource.meta?.profile?.includes(profile)
    );
  }

  private parseComparisonParam(param: string): [string, string] {
    const prefixes = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];

    for (const prefix of prefixes) {
      if (param.startsWith(prefix)) {
        return [prefix, param.substring(prefix.length)];
      }
    }

    // Default to equality if no prefix
    return ['eq', param];
  }

  // Pagination helpers
  protected applyPagination<R>(
    items: R[],
    count?: number,
    offset?: number
  ): { items: R[]; total: number } {
    const total = items.length;
    const pageSize = count || 20;
    const startIndex = offset || 0;

    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      total
    };
  }

  // Common validation helpers
  protected validateReference(reference: fhir4.Reference): boolean {
    if (!reference.reference) return false;

    // Check if reference follows the pattern ResourceType/id
    const referencePattern = /^[A-Z][a-zA-Z]+\/[A-Za-z0-9\-\.]{1,64}$/;
    return referencePattern.test(reference.reference);
  }

  protected validateCodeableConcept(concept: fhir4.CodeableConcept): boolean {
    if (!concept.coding || concept.coding.length === 0) {
      return !!concept.text;
    }

    return concept.coding.every(coding =>
      coding.code && (coding.system || coding.userSelected)
    );
  }

  protected validateIdentifier(identifier: fhir4.Identifier): boolean {
    return !!(identifier.value && (identifier.system || identifier.type));
  }

  // Resource-specific search helpers
  protected searchByIdentifier(
    resources: T[],
    identifier?: string
  ): T[] {
    if (!identifier) return resources;

    return resources.filter((resource: any) =>
      resource.identifier?.some((id: fhir4.Identifier) =>
        id.value?.toLowerCase().includes(identifier.toLowerCase()) ||
        id.system?.toLowerCase().includes(identifier.toLowerCase())
      )
    );
  }

  protected searchByDate(
    resources: T[],
    dateField: string,
    dateValue?: string
  ): T[] {
    if (!dateValue) return resources;

    try {
      const [operator, date] = this.parseComparisonParam(dateValue);
      const targetDate = new Date(date);

      return resources.filter((resource: any) => {
        const resourceDate = this.getFieldValue(resource, dateField);
        if (!resourceDate) return false;

        const resDate = new Date(resourceDate);
        switch (operator) {
          case 'eq':
            return resDate.toDateString() === targetDate.toDateString();
          case 'ne':
            return resDate.toDateString() !== targetDate.toDateString();
          case 'gt':
            return resDate.getTime() > targetDate.getTime();
          case 'ge':
            return resDate.getTime() >= targetDate.getTime();
          case 'lt':
            return resDate.getTime() < targetDate.getTime();
          case 'le':
            return resDate.getTime() <= targetDate.getTime();
          default:
            return resDate.toDateString() === targetDate.toDateString();
        }
      });
    } catch (error) {
      logger.warn(`Invalid date parameter for ${dateField}: ${dateValue}`);
      return resources;
    }
  }
}