import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export class SecurityMiddleware {
  // General rate limiting
  static createRateLimiter = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
    return rateLimit({
      windowMs,
      max,
      message: {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    });
  };

  // Strict rate limiting for authentication endpoints
  static createAuthRateLimiter = () => {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      skipSuccessfulRequests: true,
      message: {
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: 15 * 60
      },
      handler: (_req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too many authentication attempts',
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          retryAfter: 15 * 60
        });
      }
    });
  };

  // Security headers middleware
  static securityHeaders = () => {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  };

  // CORS configuration
  static configureCORS = () => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://your-production-domain.com'
      ];

      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }

      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With'
      );
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');

      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      next();
    };
  };

  // Request logging middleware
  static requestLogger = () => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const start = Date.now();
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Log request
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${ip} - UserAgent: ${userAgent}`);

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });

      next();
    };
  };

  // Security event monitoring
  static securityMonitor = () => {
    return (req: Request, _res: Response, next: NextFunction): void => {
      // Monitor for suspicious patterns
      const suspiciousPatterns = [
        /admin/i,
        /\.\.\/|\.\.\\/, // Path traversal
        /<script|javascript:/i, // XSS attempts
        /union.*select|select.*from/i, // SQL injection
        /'.*or.*1.*=.*1/i // SQL injection
      ];

      const requestData = JSON.stringify({
        url: req.url,
        body: req.body,
        query: req.query,
        headers: req.headers
      });

      const isSuspicious = suspiciousPatterns.some(pattern =>
        pattern.test(requestData)
      );

      if (isSuspicious) {
        console.warn(`[SECURITY ALERT] Suspicious request detected from ${req.ip}: ${req.method} ${req.path}`);
        console.warn(`Request data: ${requestData}`);

        // You could implement additional actions here:
        // - Block the request
        // - Send alerts
        // - Log to security monitoring system
      }

      next();
    };
  };

  // Request size limiting
  static requestSizeLimit = (limit: string = '10mb') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const contentLength = parseInt(req.get('content-length') || '0');
      const maxSize = SecurityMiddleware.parseSize(limit);

      if (contentLength > maxSize) {
        res.status(413).json({
          error: 'Request entity too large',
          code: 'PAYLOAD_TOO_LARGE',
          maxSize: limit
        });
        return;
      }

      next();
    };
  };

  private static parseSize(size: string): number {
    const units: Record<string, number> = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };

    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2];

    return value * units[unit];
  }
}