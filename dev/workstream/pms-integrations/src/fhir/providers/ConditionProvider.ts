import { BaseProvider } from './BaseProvider';
import { ExtendedCondition, FhirBundle, FhirSearchParams } from '../../types/fhir';

export class ConditionProvider extends BaseProvider<ExtendedCondition> {
  private conditions: Map<string, ExtendedCondition> = new Map();

  constructor() {
    super('Condition');
  }

  async search(params: FhirSearchParams): Promise<FhirBundle> {
    const results = Array.from(this.conditions.values());
    return this.createSearchBundle(results, results.length, params);
  }

  async read(id: string): Promise<ExtendedCondition | null> {
    return this.conditions.get(id) || null;
  }

  async create(resource: ExtendedCondition): Promise<ExtendedCondition> {
    resource.id = resource.id || this.generateId();
    resource.meta = this.createMeta();
    this.conditions.set(resource.id, resource);
    return resource;
  }

  async update(id: string, resource: ExtendedCondition): Promise<ExtendedCondition> {
    const existing = this.conditions.get(id);
    if (!existing) throw new Error('Condition not found');
    resource.id = id;
    resource.meta = this.createMeta('2');
    this.conditions.set(id, resource);
    return resource;
  }

  async patch(id: string, patch: any): Promise<ExtendedCondition> {
    const existing = this.conditions.get(id);
    if (!existing) throw new Error('Condition not found');
    const updated = { ...existing, ...patch };
    return this.update(id, updated);
  }

  async delete(id: string): Promise<void> {
    if (!this.conditions.has(id)) throw new Error('Condition not found');
    this.conditions.delete(id);
  }

  async history(id: string): Promise<FhirBundle> {
    const resource = this.conditions.get(id);
    if (!resource) throw new Error('Condition not found');
    return this.createSearchBundle([resource], 1, {});
  }

  async vread(id: string, versionId: string): Promise<ExtendedCondition | null> {
    const resource = this.conditions.get(id);
    if (!resource || resource.meta?.versionId !== versionId) return null;
    return resource;
  }
}