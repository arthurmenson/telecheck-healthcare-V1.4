import { BaseProvider } from './BaseProvider';
import { ExtendedEncounter, FhirBundle, FhirSearchParams } from '../../types/fhir';
import { logger } from '../../utils/logger';

export class EncounterProvider extends BaseProvider<ExtendedEncounter> {
  private encounters: Map<string, ExtendedEncounter> = new Map();

  constructor() {
    super('Encounter');
  }

  async search(params: FhirSearchParams): Promise<FhirBundle> {
    const results = Array.from(this.encounters.values());
    return this.createSearchBundle(results, results.length, params);
  }

  async read(id: string): Promise<ExtendedEncounter | null> {
    return this.encounters.get(id) || null;
  }

  async create(encounter: ExtendedEncounter): Promise<ExtendedEncounter> {
    encounter.id = encounter.id || this.generateId();
    encounter.meta = this.createMeta();
    this.encounters.set(encounter.id, encounter);
    return encounter;
  }

  async update(id: string, encounter: ExtendedEncounter): Promise<ExtendedEncounter> {
    const existing = this.encounters.get(id);
    if (!existing) throw new Error('Encounter not found');

    encounter.id = id;
    encounter.meta = this.createMeta('2');
    this.encounters.set(id, encounter);
    return encounter;
  }

  async patch(id: string, patch: any): Promise<ExtendedEncounter> {
    const existing = this.encounters.get(id);
    if (!existing) throw new Error('Encounter not found');

    const updated = { ...existing, ...patch };
    return this.update(id, updated);
  }

  async delete(id: string): Promise<void> {
    if (!this.encounters.has(id)) throw new Error('Encounter not found');
    this.encounters.delete(id);
  }

  async history(id: string): Promise<FhirBundle> {
    const encounter = this.encounters.get(id);
    if (!encounter) throw new Error('Encounter not found');

    return this.createSearchBundle([encounter], 1, {});
  }

  async vread(id: string, versionId: string): Promise<ExtendedEncounter | null> {
    const encounter = this.encounters.get(id);
    if (!encounter || encounter.meta?.versionId !== versionId) return null;
    return encounter;
  }
}