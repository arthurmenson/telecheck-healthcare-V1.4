import { describe, it, expect, beforeEach } from 'vitest'
import { UserService, type CreateUserRequest } from '../../src/services/UserService'

describe('UserService', () => {
  let userService: UserService

  beforeEach(() => {
    userService = new UserService()
  })

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const request: CreateUserRequest = {
        email: 'test@example.com',
        name: 'Test User'
      }

      const user = await userService.createUser(request)

      expect(user).toBeDefined()
      expect(user.id).toBe('1')
      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test User')
      expect(user.isActive).toBe(true)
      expect(user.createdAt).toBeInstanceOf(Date)
    })

    it('should normalize email to lowercase', async () => {
      const request: CreateUserRequest = {
        email: 'TEST@EXAMPLE.COM',
        name: 'Test User'
      }

      const user = await userService.createUser(request)
      expect(user.email).toBe('test@example.com')
    })

    it('should trim whitespace from name', async () => {
      const request: CreateUserRequest = {
        email: 'test@example.com',
        name: '  Test User  '
      }

      const user = await userService.createUser(request)
      expect(user.name).toBe('Test User')
    })

    it('should throw error for missing email', async () => {
      const request: CreateUserRequest = {
        email: '',
        name: 'Test User'
      }

      await expect(userService.createUser(request)).rejects.toThrow('Email and name are required')
    })

    it('should throw error for missing name', async () => {
      const request: CreateUserRequest = {
        email: 'test@example.com',
        name: ''
      }

      await expect(userService.createUser(request)).rejects.toThrow('Email and name are required')
    })

    it('should throw error for invalid email format', async () => {
      const request: CreateUserRequest = {
        email: 'invalid-email',
        name: 'Test User'
      }

      await expect(userService.createUser(request)).rejects.toThrow('Invalid email format')
    })

    it('should throw error for duplicate email', async () => {
      const request: CreateUserRequest = {
        email: 'test@example.com',
        name: 'Test User'
      }

      await userService.createUser(request)
      await expect(userService.createUser(request)).rejects.toThrow('User with this email already exists')
    })

    it('should increment user IDs correctly', async () => {
      const user1 = await userService.createUser({ email: 'user1@example.com', name: 'User 1' })
      const user2 = await userService.createUser({ email: 'user2@example.com', name: 'User 2' })

      expect(user1.id).toBe('1')
      expect(user2.id).toBe('2')
    })
  })

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const createdUser = await userService.createUser({ email: 'test@example.com', name: 'Test User' })
      const foundUser = await userService.getUserById(createdUser.id)

      expect(foundUser).toEqual(createdUser)
    })

    it('should return null when user not found', async () => {
      const user = await userService.getUserById('999')
      expect(user).toBeNull()
    })
  })

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const createdUser = await userService.createUser({ email: 'test@example.com', name: 'Test User' })
      const foundUser = await userService.getUserByEmail('test@example.com')

      expect(foundUser).toEqual(createdUser)
    })

    it('should be case insensitive', async () => {
      await userService.createUser({ email: 'test@example.com', name: 'Test User' })
      const foundUser = await userService.getUserByEmail('TEST@EXAMPLE.COM')

      expect(foundUser).toBeDefined()
      expect(foundUser?.email).toBe('test@example.com')
    })

    it('should return null when user not found', async () => {
      const user = await userService.getUserByEmail('nonexistent@example.com')
      expect(user).toBeNull()
    })
  })

  describe('getAllUsers', () => {
    it('should return empty array when no users', async () => {
      const users = await userService.getAllUsers()
      expect(users).toEqual([])
    })

    it('should return all users', async () => {
      await userService.createUser({ email: 'user1@example.com', name: 'User 1' })
      await userService.createUser({ email: 'user2@example.com', name: 'User 2' })

      const users = await userService.getAllUsers()
      expect(users).toHaveLength(2)
    })
  })

  describe('updateUser', () => {
    it('should update user name', async () => {
      const user = await userService.createUser({ email: 'test@example.com', name: 'Original Name' })
      const updatedUser = await userService.updateUser(user.id, { name: 'Updated Name' })

      expect(updatedUser).toBeDefined()
      expect(updatedUser?.name).toBe('Updated Name')
      expect(updatedUser?.email).toBe('test@example.com')
    })

    it('should update user active status', async () => {
      const user = await userService.createUser({ email: 'test@example.com', name: 'Test User' })
      const updatedUser = await userService.updateUser(user.id, { isActive: false })

      expect(updatedUser?.isActive).toBe(false)
    })

    it('should trim whitespace from updated name', async () => {
      const user = await userService.createUser({ email: 'test@example.com', name: 'Test User' })
      const updatedUser = await userService.updateUser(user.id, { name: '  Updated Name  ' })

      expect(updatedUser?.name).toBe('Updated Name')
    })

    it('should return null for non-existent user', async () => {
      const result = await userService.updateUser('999', { name: 'New Name' })
      expect(result).toBeNull()
    })
  })

  describe('deleteUser', () => {
    it('should delete existing user', async () => {
      const user = await userService.createUser({ email: 'test@example.com', name: 'Test User' })
      const deleted = await userService.deleteUser(user.id)

      expect(deleted).toBe(true)

      const foundUser = await userService.getUserById(user.id)
      expect(foundUser).toBeNull()
    })

    it('should return false for non-existent user', async () => {
      const deleted = await userService.deleteUser('999')
      expect(deleted).toBe(false)
    })
  })

  describe('getUserCount', () => {
    it('should return 0 when no users', async () => {
      const count = await userService.getUserCount()
      expect(count).toBe(0)
    })

    it('should return correct count', async () => {
      await userService.createUser({ email: 'user1@example.com', name: 'User 1' })
      await userService.createUser({ email: 'user2@example.com', name: 'User 2' })

      const count = await userService.getUserCount()
      expect(count).toBe(2)
    })
  })

  describe('getActiveUserCount', () => {
    it('should return 0 when no active users', async () => {
      const user = await userService.createUser({ email: 'test@example.com', name: 'Test User' })
      await userService.updateUser(user.id, { isActive: false })

      const count = await userService.getActiveUserCount()
      expect(count).toBe(0)
    })

    it('should return correct active user count', async () => {
      const user1 = await userService.createUser({ email: 'user1@example.com', name: 'User 1' })
      await userService.createUser({ email: 'user2@example.com', name: 'User 2' })
      await userService.updateUser(user1.id, { isActive: false })

      const count = await userService.getActiveUserCount()
      expect(count).toBe(1)
    })
  })
})