import { BaseProvider } from './BaseProvider';
import { FhirBundle, FhirSearchParams } from '../../types/fhir';

export class ProcedureProvider extends BaseProvider<any> {
  private resources: Map<string, any> = new Map();

  constructor() {
    super('Procedure' as any);
  }

  async search(params: FhirSearchParams): Promise<FhirBundle> {
    const results = Array.from(this.resources.values());
    return this.createSearchBundle(results, results.length, params);
  }

  async read(id: string): Promise<any | null> {
    return this.resources.get(id) || null;
  }

  async create(resource: any): Promise<any> {
    resource.id = resource.id || this.generateId();
    resource.meta = this.createMeta();
    this.resources.set(resource.id, resource);
    return resource;
  }

  async update(id: string, resource: any): Promise<any> {
    const existing = this.resources.get(id);
    if (!existing) throw new Error('Resource not found');
    resource.id = id;
    resource.meta = this.createMeta('2');
    this.resources.set(id, resource);
    return resource;
  }

  async patch(id: string, patch: any): Promise<any> {
    const existing = this.resources.get(id);
    if (!existing) throw new Error('Resource not found');
    const updated = { ...existing, ...patch };
    return this.update(id, updated);
  }

  async delete(id: string): Promise<void> {
    if (!this.resources.has(id)) throw new Error('Resource not found');
    this.resources.delete(id);
  }

  async history(id: string): Promise<FhirBundle> {
    const resource = this.resources.get(id);
    if (!resource) throw new Error('Resource not found');
    return this.createSearchBundle([resource], 1, {});
  }

  async vread(id: string, versionId: string): Promise<any | null> {
    const resource = this.resources.get(id);
    if (!resource || resource.meta?.versionId !== versionId) return null;
    return resource;
  }
}
