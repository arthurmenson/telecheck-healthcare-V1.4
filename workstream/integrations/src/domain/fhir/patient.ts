import { ValidationResult } from './validation-error';
import Joi from 'joi';

export interface FhirHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
}

export interface FhirContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
}

export interface FhirAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  address?: FhirAddress[];
  maritalStatus?: {
    coding: {
      system: string;
      code: string;
      display?: string;
    }[];
  };
  contact?: {
    relationship?: {
      coding: {
        system: string;
        code: string;
        display?: string;
      }[];
    }[];
    name?: FhirHumanName;
    telecom?: FhirContactPoint[];
    address?: FhirAddress;
    gender?: 'male' | 'female' | 'other' | 'unknown';
  }[];
}

export class PatientValidator {
  private schema = Joi.object({
    resourceType: Joi.string().valid('Patient').required().messages({
      'any.only': 'resourceType must be "Patient"'
    }),
    id: Joi.string().required().messages({
      'any.required': 'id is required'
    }),
    active: Joi.boolean(),
    name: Joi.array().items(
      Joi.object({
        use: Joi.string().valid('usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden'),
        family: Joi.string(),
        given: Joi.array().items(Joi.string()),
        prefix: Joi.array().items(Joi.string()),
        suffix: Joi.array().items(Joi.string())
      })
    ),
    telecom: Joi.array().items(
      Joi.object({
        system: Joi.string().valid('phone', 'fax', 'email', 'pager', 'url', 'sms', 'other').messages({
          'any.only': 'telecom[{#label}].system must be one of: phone, fax, email, pager, url, sms, other'
        }),
        value: Joi.string(),
        use: Joi.string().valid('home', 'work', 'temp', 'old', 'mobile'),
        rank: Joi.number().integer().min(1)
      })
    ),
    gender: Joi.string().valid('male', 'female', 'other', 'unknown'),
    birthDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
    address: Joi.array().items(
      Joi.object({
        use: Joi.string().valid('home', 'work', 'temp', 'old', 'billing'),
        type: Joi.string().valid('postal', 'physical', 'both'),
        text: Joi.string(),
        line: Joi.array().items(Joi.string()),
        city: Joi.string(),
        district: Joi.string(),
        state: Joi.string(),
        postalCode: Joi.string(),
        country: Joi.string()
      })
    )
  });

  validate(patient: any): ValidationResult {
    const { error } = this.schema.validate(patient, {
      abortEarly: false,
      allowUnknown: false
    });

    if (!error) {
      return { isValid: true, errors: [] };
    }

    const errors = error.details.map(detail =>
      detail.message.replace(/"/g, '').replace(/\[(\d+)\]/g, '[$1]')
    );

    return { isValid: false, errors };
  }
}

export namespace FhirPatient {
  export function fromPlainObject(data: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    isActive?: boolean;
    gender?: 'male' | 'female' | 'other' | 'unknown';
    birthDate?: string;
  }): FhirPatient {
    const patient: FhirPatient = {
      resourceType: 'Patient',
      id: data.id,
      active: data.isActive
    };

    if (data.firstName || data.lastName) {
      patient.name = [{
        family: data.lastName,
        given: data.firstName ? [data.firstName] : undefined
      }];
    }

    const telecom: FhirContactPoint[] = [];
    if (data.email) {
      telecom.push({ system: 'email', value: data.email });
    }
    if (data.phone) {
      telecom.push({ system: 'phone', value: data.phone });
    }
    if (telecom.length > 0) {
      patient.telecom = telecom;
    }

    if (data.gender) {
      patient.gender = data.gender;
    }

    if (data.birthDate) {
      patient.birthDate = data.birthDate;
    }

    return patient;
  }

  export function toPlainObject(patient: FhirPatient): {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    isActive?: boolean;
  } {
    const result = {
      id: patient.id,
      isActive: patient.active
    } as any;

    if (patient.name?.[0]) {
      const name = patient.name[0];
      result.lastName = name.family;
      result.firstName = name.given?.[0];
    }

    if (patient.telecom) {
      for (const contact of patient.telecom) {
        if (contact.system === 'email' && contact.value) {
          result.email = contact.value;
        } else if (contact.system === 'phone' && contact.value) {
          result.phone = contact.value;
        }
      }
    }

    return result;
  }
}