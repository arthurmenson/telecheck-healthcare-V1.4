import postgres from 'postgres';
import type { DatabaseConfig } from './config';

export interface PoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  maxConnections: number;
  connectionFailures: number;
  averageQueryTime: number;
  slowQueries: number;
  totalQueries: number;
  uptime: number;
  lastHealthCheck: Date;
  healthy: boolean;
}

export interface ConnectionEvent {
  type: 'connect' | 'disconnect' | 'error' | 'slow_query';
  timestamp: Date;
  connectionId?: string;
  duration?: number;
  query?: string;
  error?: string;
}

export class PoolMonitor {
  private config: DatabaseConfig;
  private metrics: PoolMetrics;
  private events: ConnectionEvent[] = [];
  private startTime: Date;
  private monitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private sql?: postgres.Sql;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.startTime = new Date();
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      maxConnections: config.DATABASE_POOL_MAX,
      connectionFailures: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      totalQueries: 0,
      uptime: 0,
      lastHealthCheck: new Date(),
      healthy: true
    };
  }

  async start(): Promise<void> {
    if (this.monitoring) {
      return;
    }

    this.sql = postgres(this.config.DATABASE_URL, {
      max: this.config.DATABASE_POOL_MAX,
      idle_timeout: this.config.DATABASE_POOL_IDLE_TIMEOUT,
      onnotice: this.handleNotice.bind(this),
      debug: this.config.DATABASE_LOG_LEVEL === 'debug',
    });

    this.monitoring = true;
    this.monitoringInterval = setInterval(
      this.collectMetrics.bind(this),
      5000 // Collect metrics every 5 seconds
    );

    console.log('Pool monitoring started');
  }

  async stop(): Promise<void> {
    if (!this.monitoring) {
      return;
    }

    this.monitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.sql) {
      await this.sql.end();
    }

    console.log('Pool monitoring stopped');
  }

  private handleNotice(notice: any): void {
    if (this.config.DATABASE_LOG_LEVEL === 'debug') {
      console.log('PostgreSQL notice:', notice);
    }
  }

  private async collectMetrics(): Promise<void> {
    if (!this.sql) return;

    try {
      const connectionStats = await this.getConnectionStats();
      const performanceStats = await this.getPerformanceStats();

      this.metrics = {
        ...this.metrics,
        ...connectionStats,
        ...performanceStats,
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        lastHealthCheck: new Date(),
        healthy: true
      };

      if (this.config.DATABASE_LOG_LEVEL === 'debug') {
        console.log('Pool metrics updated:', this.metrics);
      }
    } catch (error) {
      this.metrics.healthy = false;
      this.addEvent({
        type: 'error',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (this.config.DATABASE_LOG_LEVEL !== 'error') {
        console.error('Failed to collect pool metrics:', error);
      }
    }
  }

  private async getConnectionStats(): Promise<Partial<PoolMetrics>> {
    if (!this.sql) return {};

    try {
      const result = await this.sql`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle,
          count(*) FILTER (WHERE state = 'idle in transaction') as waiting
        FROM pg_stat_activity
        WHERE datname = ${this.config.DATABASE_NAME}
          AND pid != pg_backend_pid()
      `;

      const stats = result[0];
      return {
        totalConnections: parseInt(stats.total as string) || 0,
        activeConnections: parseInt(stats.active as string) || 0,
        idleConnections: parseInt(stats.idle as string) || 0,
        waitingConnections: parseInt(stats.waiting as string) || 0
      };
    } catch (error) {
      throw new Error(`Failed to get connection stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getPerformanceStats(): Promise<Partial<PoolMetrics>> {
    if (!this.sql) return {};

    try {
      const result = await this.sql`
        SELECT
          calls as total_queries,
          mean_exec_time as avg_time,
          calls FILTER (WHERE mean_exec_time > ${this.config.DATABASE_SLOW_QUERY_THRESHOLD}) as slow_queries
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_%'
        ORDER BY calls DESC
        LIMIT 1
      `;

      if (result.length === 0) {
        return {
          totalQueries: this.metrics.totalQueries,
          averageQueryTime: this.metrics.averageQueryTime,
          slowQueries: this.metrics.slowQueries
        };
      }

      const stats = result[0];
      return {
        totalQueries: parseInt(stats.total_queries as string) || 0,
        averageQueryTime: parseFloat(stats.avg_time as string) || 0,
        slowQueries: parseInt(stats.slow_queries as string) || 0
      };
    } catch (error) {
      return {
        totalQueries: this.metrics.totalQueries,
        averageQueryTime: this.metrics.averageQueryTime,
        slowQueries: this.metrics.slowQueries
      };
    }
  }

  getMetrics(): PoolMetrics {
    return { ...this.metrics };
  }

  getEvents(limit = 100): ConnectionEvent[] {
    return this.events.slice(-limit);
  }

  private addEvent(event: ConnectionEvent): void {
    this.events.push(event);
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.sql) return false;

    try {
      const startTime = Date.now();
      await this.sql`SELECT 1 as health_check`;
      const duration = Date.now() - startTime;

      this.addEvent({
        type: 'connect',
        timestamp: new Date(),
        duration
      });

      return duration < 1000; // Consider healthy if response time < 1s
    } catch (error) {
      this.addEvent({
        type: 'error',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  getAlerts(): string[] {
    const alerts: string[] = [];
    const metrics = this.metrics;

    if (!metrics.healthy) {
      alerts.push('Database is unhealthy');
    }

    if (metrics.activeConnections >= metrics.maxConnections * 0.9) {
      alerts.push('Connection pool near capacity');
    }

    if (metrics.averageQueryTime > this.config.DATABASE_SLOW_QUERY_THRESHOLD * 2) {
      alerts.push('Average query time is high');
    }

    if (metrics.connectionFailures > 10) {
      alerts.push('High number of connection failures');
    }

    const recentEvents = this.getEvents(50);
    const recentErrors = recentEvents.filter(e => e.type === 'error').length;
    if (recentErrors > 5) {
      alerts.push('High error rate detected');
    }

    return alerts;
  }

  logStatus(): void {
    const metrics = this.getMetrics();
    const alerts = this.getAlerts();

    console.log('\n=== Database Pool Status ===');
    console.log(`Connections: ${metrics.activeConnections}/${metrics.maxConnections} (${metrics.idleConnections} idle)`);
    console.log(`Queries: ${metrics.totalQueries} total, ${metrics.averageQueryTime.toFixed(2)}ms avg`);
    console.log(`Slow queries: ${metrics.slowQueries}`);
    console.log(`Uptime: ${metrics.uptime}s`);
    console.log(`Healthy: ${metrics.healthy ? '✓' : '✗'}`);

    if (alerts.length > 0) {
      console.log('\n⚠️  Alerts:');
      alerts.forEach(alert => console.log(`  - ${alert}`));
    }

    console.log('===========================\n');
  }
}