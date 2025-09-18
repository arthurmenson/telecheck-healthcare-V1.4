import { Router } from 'express';
import { LabController } from '../controllers/LabController';
import { LabService } from '../services/LabService';

const router = Router();

// Using in-memory service for now - will be replaced with database-backed service in production
const labService = new LabService();
const labController = new LabController(labService);

/**
 * @swagger
 * /api/laboratory:
 *   post:
 *     summary: Create a new lab test result
 *     tags: [Laboratory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLabTestResult'
 *     responses:
 *       201:
 *         description: Lab result created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LabTestResult'
 *       400:
 *         description: Validation error
 */
router.post('/', (req, res) => labController.createLabResult(req, res));

/**
 * @swagger
 * /api/laboratory:
 *   get:
 *     summary: List all lab results
 *     tags: [Laboratory]
 *     responses:
 *       200:
 *         description: List of lab results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LabTestResult'
 *                 count:
 *                   type: number
 */
router.get('/', (req, res) => labController.listLabResults(req, res));

/**
 * @swagger
 * /api/laboratory/{id}:
 *   get:
 *     summary: Get lab result by ID
 *     tags: [Laboratory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lab result ID
 *     responses:
 *       200:
 *         description: Lab result found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LabTestResult'
 *       404:
 *         description: Lab result not found
 */
router.get('/:id', (req, res) => labController.getLabResult(req, res));

/**
 * @swagger
 * /api/laboratory/patient/{patientId}:
 *   get:
 *     summary: Get all lab results for a patient
 *     tags: [Laboratory]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Patient lab results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LabTestResult'
 *                 count:
 *                   type: number
 */
router.get('/patient/:patientId', (req, res) => labController.getPatientLabResults(req, res));

/**
 * @swagger
 * /api/laboratory/{id}:
 *   put:
 *     summary: Update lab result
 *     tags: [Laboratory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lab result ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateLabTestResult'
 *     responses:
 *       200:
 *         description: Lab result updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LabTestResult'
 *       404:
 *         description: Lab result not found
 */
router.put('/:id', (req, res) => labController.updateLabResult(req, res));

/**
 * @swagger
 * /api/laboratory/{id}:
 *   delete:
 *     summary: Delete lab result
 *     tags: [Laboratory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lab result ID
 *     responses:
 *       204:
 *         description: Lab result deleted successfully
 *       404:
 *         description: Lab result not found
 */
router.delete('/:id', (req, res) => labController.deleteLabResult(req, res));

export default router;