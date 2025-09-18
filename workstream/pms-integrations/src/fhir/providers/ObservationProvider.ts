import { BaseProvider } from './BaseProvider';
import { ExtendedObservation, FhirBundle, FhirSearchParams } from '../../types/fhir';

export class ObservationProvider extends BaseProvider<ExtendedObservation> {
  private observations: Map<string, ExtendedObservation> = new Map();

  constructor() {
    super('Observation');
  }

  async search(params: FhirSearchParams): Promise<FhirBundle> {
    const results = Array.from(this.observations.values());
    return this.createSearchBundle(results, results.length, params);
  }

  async read(id: string): Promise<ExtendedObservation | null> {
    return this.observations.get(id) || null;
  }

  async create(observation: ExtendedObservation): Promise<ExtendedObservation> {
    observation.id = observation.id || this.generateId();
    observation.meta = this.createMeta();
    this.observations.set(observation.id, observation);
    return observation;
  }

  async update(id: string, observation: ExtendedObservation): Promise<ExtendedObservation> {
    const existing = this.observations.get(id);
    if (!existing) throw new Error('Observation not found');

    observation.id = id;
    observation.meta = this.createMeta('2');
    this.observations.set(id, observation);
    return observation;
  }

  async patch(id: string, patch: any): Promise<ExtendedObservation> {
    const existing = this.observations.get(id);
    if (!existing) throw new Error('Observation not found');

    const updated = { ...existing, ...patch };
    return this.update(id, updated);
  }

  async delete(id: string): Promise<void> {
    if (!this.observations.has(id)) throw new Error('Observation not found');
    this.observations.delete(id);
  }

  async history(id: string): Promise<FhirBundle> {
    const observation = this.observations.get(id);
    if (!observation) throw new Error('Observation not found');

    return this.createSearchBundle([observation], 1, {});
  }

  async vread(id: string, versionId: string): Promise<ExtendedObservation | null> {
    const observation = this.observations.get(id);
    if (!observation || observation.meta?.versionId !== versionId) return null;
    return observation;
  }
}