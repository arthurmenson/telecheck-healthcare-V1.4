import type { Request, Response } from 'express';
import { PatientService } from '../services/PatientService';
import { CreatePatientSchema, UpdatePatientSchema } from '../types/Patient';
import { z } from 'zod';

export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  async createPatient(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = CreatePatientSchema.parse(req.body);
      const result = await this.patientService.createPatient(validatedData);

      if (!result.success) {
        res.status(400).json({
          error: result.error.code,
          message: result.error.message,
          details: result.error.details
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: { issues: error.issues }
        });
        return;
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      });
    }
  }

  async getPatient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'MISSING_PARAMETER',
          message: 'Patient ID is required'
        });
        return;
      }

      const result = await this.patientService.getPatient(id);

      if (!result.success) {
        const statusCode = result.error.code === 'PATIENT_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json({
          error: result.error.code,
          message: result.error.message
        });
        return;
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      });
    }
  }

  async updatePatient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'MISSING_PARAMETER',
          message: 'Patient ID is required'
        });
        return;
      }

      const validatedData = UpdatePatientSchema.parse(req.body);
      const result = await this.patientService.updatePatient(id, validatedData);

      if (!result.success) {
        const statusCode = result.error.code === 'PATIENT_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json({
          error: result.error.code,
          message: result.error.message,
          details: result.error.details
        });
        return;
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: { issues: error.issues }
        });
        return;
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      });
    }
  }

  async deletePatient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'MISSING_PARAMETER',
          message: 'Patient ID is required'
        });
        return;
      }

      const result = await this.patientService.deletePatient(id);

      if (!result.success) {
        const statusCode = result.error.code === 'PATIENT_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json({
          error: result.error.code,
          message: result.error.message
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      });
    }
  }

  async listPatients(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.patientService.listPatients();

      if (!result.success) {
        res.status(400).json({
          error: result.error.code,
          message: result.error.message
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
        count: result.data.length
      });
    } catch (error) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      });
    }
  }
}