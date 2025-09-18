import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export class SecurityMiddleware {
  initialize(): express.RequestHandler[] {
    return [
      // Basic security headers
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
      }),

      // Rate limiting
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      }),

      // Request ID
      (req: any, res, next) => {
        req.id = req.id || Math.random().toString(36).substring(7);
        res.setHeader('X-Request-ID', req.id);
        next();
      }
    ];
  }
}