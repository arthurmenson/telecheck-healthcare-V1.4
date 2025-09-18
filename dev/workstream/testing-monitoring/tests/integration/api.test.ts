import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import app from '../../src/app'

describe('API Integration Tests', () => {
  beforeEach(async () => {
    // Clear any existing test data
  })

  afterEach(async () => {
    // Cleanup after tests
  })

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'healthy')
      expect(response.body).toHaveProperty('timestamp')
    })

    it('should return prometheus metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200)

      expect(response.text).toContain('# HELP')
      expect(response.headers['content-type']).toContain('text/plain')
    })
  })

  describe('User API', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`
      }

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.name).toBe(userData.name)
      expect(response.body.email).toBe(userData.email)
      expect(response.body.isActive).toBe(true)
    })

    it('should get all users', async () => {
      await request(app)
        .post('/api/users')
        .send({ name: 'User 1', email: 'user1@example.com' })

      await request(app)
        .post('/api/users')
        .send({ name: 'User 2', email: 'user2@example.com' })

      const response = await request(app)
        .get('/api/users')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThanOrEqual(2)
    })

    it('should get user by id', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`

      const createResponse = await request(app)
        .post('/api/users')
        .send({ name: 'Test User', email: uniqueEmail })
        .expect(201)

      const userId = createResponse.body.id

      const response = await request(app)
        .get(`/api/users/${userId}`)
        .expect(200)

      expect(response.body.id).toBe(userId)
      expect(response.body.name).toBe('Test User')
    })

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .get('/api/users/999')
        .expect(404)
    })

    it('should update user', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({ name: 'Original Name', email: 'original@example.com' })

      const userId = createResponse.body.id

      const response = await request(app)
        .put(`/api/users/${userId}`)
        .send({ name: 'Updated Name' })
        .expect(200)

      expect(response.body.name).toBe('Updated Name')
      expect(response.body.email).toBe('original@example.com')
    })

    it('should delete user', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({ name: 'Delete Me', email: 'delete@example.com' })

      const userId = createResponse.body.id

      await request(app)
        .delete(`/api/users/${userId}`)
        .expect(204)

      await request(app)
        .get(`/api/users/${userId}`)
        .expect(404)
    })

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'Invalid User', email: 'invalid-email' })
        .expect(400)

      expect(response.body.error).toContain('Invalid email format')
    })

    it('should prevent duplicate emails', async () => {
      await request(app)
        .post('/api/users')
        .send({ name: 'First User', email: 'duplicate@example.com' })
        .expect(201)

      const response = await request(app)
        .post('/api/users')
        .send({ name: 'Second User', email: 'duplicate@example.com' })
        .expect(400)

      expect(response.body.error).toContain('User with this email already exists')
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404)

      expect(response.body.error).toBe('Route not found')
    })

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/users')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(500) // Express returns 500 for malformed JSON by default
    })
  })
})