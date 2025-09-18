export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
  isActive: boolean
}

export interface CreateUserRequest {
  email: string
  name: string
}

export class UserService {
  private users: Map<string, User> = new Map()
  private nextId = 1

  async createUser(request: CreateUserRequest): Promise<User> {
    if (!request.email || !request.name) {
      throw new Error('Email and name are required')
    }

    if (!this.isValidEmail(request.email)) {
      throw new Error('Invalid email format')
    }

    const existingUser = await this.getUserByEmail(request.email)
    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    const user: User = {
      id: this.nextId.toString(),
      email: request.email.toLowerCase(),
      name: request.name.trim(),
      createdAt: new Date(),
      isActive: true
    }

    this.users.set(user.id, user)
    this.nextId++

    return user
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase()
    for (const user of this.users.values()) {
      if (user.email === normalizedEmail) {
        return user
      }
    }
    return null
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values())
  }

  async updateUser(id: string, updates: Partial<Pick<User, 'name' | 'isActive'>>): Promise<User | null> {
    const user = this.users.get(id)
    if (!user) {
      return null
    }

    const updatedUser = {
      ...user,
      ...updates,
      name: updates.name?.trim() || user.name
    }

    this.users.set(id, updatedUser)
    return updatedUser
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id)
  }

  async getUserCount(): Promise<number> {
    return this.users.size
  }

  async getActiveUserCount(): Promise<number> {
    return Array.from(this.users.values()).filter(user => user.isActive).length
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}