import type { Request, Response } from 'express';
import { LabService } from '../services/LabService';
import { CreateLabTestResultSchema, UpdateLabTestResultSchema } from '../types/Laboratory';
import { z } from 'zod';

export class LabController {
  constructor(private readonly labService: LabService) {}

  async createLabResult(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = CreateLabTestResultSchema.parse(req.body);
      const result = await this.labService.createLabResult(validatedData);

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

  async getLabResult(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'MISSING_PARAMETER',
          message: 'Lab result ID is required'
        });
        return;
      }

      const result = await this.labService.getLabResult(id);

      if (!result.success) {
        const statusCode = result.error.code === 'LAB_RESULT_NOT_FOUND' ? 404 : 400;
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

  async getPatientLabResults(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;

      if (!patientId) {
        res.status(400).json({
          error: 'MISSING_PARAMETER',
          message: 'Patient ID is required'
        });
        return;
      }

      const result = await this.labService.getPatientLabResults(patientId);

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

  async updateLabResult(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'MISSING_PARAMETER',
          message: 'Lab result ID is required'
        });
        return;
      }

      const validatedData = UpdateLabTestResultSchema.parse(req.body);
      const result = await this.labService.updateLabResult(id, validatedData);

      if (!result.success) {
        const statusCode = result.error.code === 'LAB_RESULT_NOT_FOUND' ? 404 : 400;
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

  async deleteLabResult(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'MISSING_PARAMETER',
          message: 'Lab result ID is required'
        });
        return;
      }

      const result = await this.labService.deleteLabResult(id);

      if (!result.success) {
        const statusCode = result.error.code === 'LAB_RESULT_NOT_FOUND' ? 404 : 400;
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

  async listLabResults(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.labService.listLabResults();

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