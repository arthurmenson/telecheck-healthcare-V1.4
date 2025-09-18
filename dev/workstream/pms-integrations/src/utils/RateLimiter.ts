export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  async checkLimit(key: string = 'default'): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get existing requests for this key
    const keyRequests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = keyRequests.filter(timestamp => timestamp > windowStart);

    // Check if we're at the limit
    if (validRequests.length >= this.config.maxRequests) {
      const oldestRequest = Math.min(...validRequests);
      const waitTime = oldestRequest + this.config.windowMs - now;
      throw new Error(`Rate limit exceeded. Try again in ${waitTime}ms`);
    }

    // Add this request
    validRequests.push(now);
    this.requests.set(key, validRequests);
  }
}