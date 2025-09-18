import { Request, Response, NextFunction } from 'express';
import { ValidationMiddleware, ValidationSchemas } from '@/middleware/validation.middleware';

describe('ValidationMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('validate', () => {
    it('should pass validation with valid data', () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: 'patient'
      };

      const middleware = ValidationMiddleware.validate(ValidationSchemas.register);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid email', () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'SecurePassword123!',
        role: 'patient'
      };

      const middleware = ValidationMiddleware.validate(ValidationSchemas.register);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Please provide a valid email address'
          })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail validation with weak password', () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'weak',
        role: 'patient'
      };

      const middleware = ValidationMiddleware.validate(ValidationSchemas.register);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('Password must be at least 8 characters long')
          })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid role', () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: 'invalid-role'
      };

      const middleware = ValidationMiddleware.validate(ValidationSchemas.register);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'role',
            message: 'Role must be one of: patient, nurse, doctor, admin'
          })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should strip unknown fields', () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: 'patient',
        unknownField: 'should be removed'
      };

      const middleware = ValidationMiddleware.validate(ValidationSchemas.register);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body).not.toHaveProperty('unknownField');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    it('should validate URL parameters', () => {
      mockRequest.params = {
        id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const middleware = ValidationMiddleware.validateParams(ValidationSchemas.userId);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid UUID', () => {
      mockRequest.params = {
        id: 'invalid-uuid'
      };

      const middleware = ValidationMiddleware.validateParams(ValidationSchemas.userId);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Parameter validation failed',
        code: 'PARAM_VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'id',
            message: 'Invalid user ID format'
          })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeInput', () => {
    it('should remove script tags from input', () => {
      mockRequest.body = {
        message: 'Hello <script>alert("xss")</script> World'
      };

      ValidationMiddleware.sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.body.message).toBe('Hello  World');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should remove javascript: protocols', () => {
      mockRequest.body = {
        url: 'javascript:alert("xss")'
      };

      ValidationMiddleware.sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.body.url).toBe('alert("xss")');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should remove event handlers', () => {
      mockRequest.body = {
        content: '<div onclick="alert(\'xss\')">Click me</div>'
      };

      ValidationMiddleware.sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.body.content).not.toContain('onclick');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize nested objects', () => {
      mockRequest.body = {
        user: {
          name: 'John <script>alert("xss")</script> Doe',
          profile: {
            bio: 'Hello <script>alert("nested")</script> World'
          }
        }
      };

      ValidationMiddleware.sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.body.user.name).toBe('John  Doe');
      expect(mockRequest.body.user.profile.bio).toBe('Hello  World');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle query parameters', () => {
      mockRequest.query = {
        search: '<script>alert("xss")</script>test'
      };

      ValidationMiddleware.sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.query['search']).toBe('test');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('ValidationSchemas', () => {
    describe('login schema', () => {
      it('should validate valid login data', () => {
        const data = {
          email: 'test@example.com',
          password: 'password123'
        };

        const { error } = ValidationSchemas.login.validate(data);
        expect(error).toBeUndefined();
      });

      it('should validate login data with MFA code', () => {
        const data = {
          email: 'test@example.com',
          password: 'password123',
          mfaCode: '123456'
        };

        const { error } = ValidationSchemas.login.validate(data);
        expect(error).toBeUndefined();
      });

      it('should reject invalid MFA code format', () => {
        const data = {
          email: 'test@example.com',
          password: 'password123',
          mfaCode: 'abc123'
        };

        const { error } = ValidationSchemas.login.validate(data);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toContain('MFA code must contain only digits');
      });
    });

    describe('updateProfile schema', () => {
      it('should allow partial updates', () => {
        const data = {
          email: 'newemail@example.com'
        };

        const { error } = ValidationSchemas.updateProfile.validate(data);
        expect(error).toBeUndefined();
      });

      it('should allow empty updates', () => {
        const data = {};

        const { error } = ValidationSchemas.updateProfile.validate(data);
        expect(error).toBeUndefined();
      });
    });
  });
});