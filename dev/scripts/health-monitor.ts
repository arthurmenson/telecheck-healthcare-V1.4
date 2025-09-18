#!/usr/bin/env tsx

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ServiceHealth {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number | null;
  error?: string;
  lastCheck: Date;
}

interface DatabaseHealth {
  name: string;
  host: string;
  port: number;
  status: 'connected' | 'disconnected' | 'unknown';
  error?: string;
  lastCheck: Date;
}

class HealthMonitor {
  private services: ServiceHealth[] = [
    { name: 'Auth Security', url: 'http://localhost:3002/health', status: 'unknown', responseTime: null, lastCheck: new Date() },
    { name: 'AI/ML Services', url: 'http://localhost:3000/health', status: 'unknown', responseTime: null, lastCheck: new Date() },
    { name: 'Core Services', url: 'http://localhost:3001/health', status: 'unknown', responseTime: null, lastCheck: new Date() },
    { name: 'Analytics Reporting', url: 'http://localhost:3003/health', status: 'unknown', responseTime: null, lastCheck: new Date() },
    { name: 'PMS Integrations', url: 'http://localhost:3004/health', status: 'unknown', responseTime: null, lastCheck: new Date() },
    { name: 'Frontend', url: 'http://localhost:5173', status: 'unknown', responseTime: null, lastCheck: new Date() }
  ];

  private databases: DatabaseHealth[] = [
    { name: 'PostgreSQL', host: 'localhost', port: 5432, status: 'unknown', lastCheck: new Date() },
    { name: 'Redis', host: 'localhost', port: 6379, status: 'unknown', lastCheck: new Date() }
  ];

  async checkServiceHealth(service: ServiceHealth): Promise<void> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(service.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'SparkDen-HealthMonitor/1.0'
        }
      });

      clearTimeout(timeoutId);

      service.responseTime = Date.now() - startTime;
      service.status = response.ok ? 'healthy' : 'unhealthy';
      service.lastCheck = new Date();

      if (!response.ok) {
        service.error = `HTTP ${response.status}: ${response.statusText}`;
      } else {
        delete service.error;
      }

    } catch (error) {
      service.responseTime = Date.now() - startTime;
      service.status = 'unhealthy';
      service.lastCheck = new Date();

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          service.error = 'Request timeout (>5s)';
        } else if (error.message.includes('ECONNREFUSED')) {
          service.error = 'Connection refused';
        } else {
          service.error = error.message;
        }
      } else {
        service.error = 'Unknown error';
      }
    }
  }

  async checkDatabaseHealth(database: DatabaseHealth): Promise<void> {
    try {
      const result = await execAsync(`nc -z ${database.host} ${database.port}`);
      database.status = result.stderr ? 'disconnected' : 'connected';
      database.lastCheck = new Date();
      delete database.error;
    } catch (error) {
      database.status = 'disconnected';
      database.lastCheck = new Date();
      database.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  async checkDockerServices(): Promise<{ [key: string]: string }> {
    try {
      const { stdout } = await execAsync('docker-compose ps --format json 2>/dev/null || echo "[]"');

      if (!stdout.trim() || stdout.trim() === '[]') {
        return {};
      }

      const services = JSON.parse(`[${stdout.trim().split('\n').join(',')}]`);
      const serviceStatus: { [key: string]: string } = {};

      for (const service of services) {
        serviceStatus[service.Name] = service.State;
      }

      return serviceStatus;
    } catch (error) {
      console.warn('Could not check Docker services:', error instanceof Error ? error.message : 'Unknown error');
      return {};
    }
  }

  async runHealthCheck(): Promise<void> {
    // Check all services concurrently
    await Promise.all(this.services.map(service => this.checkServiceHealth(service)));

    // Check all databases concurrently
    await Promise.all(this.databases.map(database => this.checkDatabaseHealth(database)));
  }

  getHealthSummary(): { healthy: number; unhealthy: number; total: number; critical: boolean } {
    const healthyServices = this.services.filter(s => s.status === 'healthy').length;
    const totalServices = this.services.length;

    const connectedDatabases = this.databases.filter(d => d.status === 'connected').length;
    const totalDatabases = this.databases.length;

    const total = totalServices + totalDatabases;
    const healthy = healthyServices + connectedDatabases;
    const unhealthy = total - healthy;

    // Critical if database is down or more than 50% of services are down
    const critical = connectedDatabases < totalDatabases || (unhealthy / total) > 0.5;

    return { healthy, unhealthy, total, critical };
  }

  formatStatus(status: string): string {
    const colors = {
      healthy: '🟢',
      unhealthy: '🔴',
      unknown: '🟡',
      connected: '🟢',
      disconnected: '🔴'
    };

    return colors[status as keyof typeof colors] || '❓';
  }

  displayResults(dockerServices?: { [key: string]: string }): void {
    const summary = this.getHealthSummary();

    console.clear();
    console.log('🏥 Spark Den Healthcare Platform - Health Monitor');
    console.log('=================================================');
    console.log();

    // Summary
    console.log('📊 Overall Health:');
    console.log(`   Status: ${summary.critical ? '🔴 CRITICAL' : '🟢 HEALTHY'}`);
    console.log(`   Services: ${summary.healthy}/${summary.total} healthy`);
    console.log();

    // Services
    console.log('⚡ Backend Services:');
    this.services.forEach(service => {
      const statusIcon = this.formatStatus(service.status);
      const responseTime = service.responseTime !== null ? `${service.responseTime}ms` : 'N/A';
      console.log(`   ${statusIcon} ${service.name.padEnd(20)} ${responseTime.padStart(6)} ${service.error || ''}`);
    });
    console.log();

    // Databases
    console.log('🗄️  Database Services:');
    this.databases.forEach(database => {
      const statusIcon = this.formatStatus(database.status);
      console.log(`   ${statusIcon} ${database.name.padEnd(20)} ${database.host}:${database.port} ${database.error || ''}`);
    });
    console.log();

    // Docker services if available
    if (dockerServices && Object.keys(dockerServices).length > 0) {
      console.log('🐳 Docker Services:');
      Object.entries(dockerServices).forEach(([name, state]) => {
        const statusIcon = state === 'running' ? '🟢' : state === 'exited' ? '🔴' : '🟡';
        console.log(`   ${statusIcon} ${name.padEnd(30)} ${state}`);
      });
      console.log();
    }

    // Recommendations
    if (summary.unhealthy > 0) {
      console.log('🚨 Issues Detected:');

      this.services.filter(s => s.status !== 'healthy').forEach(service => {
        console.log(`   - ${service.name}: ${service.error}`);
      });

      this.databases.filter(d => d.status !== 'connected').forEach(database => {
        console.log(`   - ${database.name}: ${database.error}`);
      });

      console.log();
      console.log('💡 Troubleshooting:');
      console.log('   1. Check if Docker services are running: docker-compose ps');
      console.log('   2. View service logs: docker-compose logs [service-name]');
      console.log('   3. Restart services: docker-compose restart');
      console.log('   4. Full restart: docker-compose down && docker-compose up -d');
    }

    console.log(`📅 Last updated: ${new Date().toLocaleString()}`);
  }

  async monitor(intervalSeconds: number = 30): Promise<void> {
    console.log(`🔄 Starting health monitor (checking every ${intervalSeconds}s)...`);
    console.log('Press Ctrl+C to stop');

    const runCheck = async () => {
      await this.runHealthCheck();
      const dockerServices = await this.checkDockerServices();
      this.displayResults(dockerServices);
    };

    // Initial check
    await runCheck();

    // Set up interval
    const interval = setInterval(runCheck, intervalSeconds * 1000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Health monitor stopped');
      clearInterval(interval);
      process.exit(0);
    });
  }

  async checkOnce(): Promise<void> {
    console.log('🔍 Running health check...');
    await this.runHealthCheck();
    const dockerServices = await this.checkDockerServices();
    this.displayResults(dockerServices);

    const summary = this.getHealthSummary();
    process.exit(summary.critical ? 1 : 0);
  }
}

// CLI interface
async function main() {
  const monitor = new HealthMonitor();
  const args = process.argv.slice(2);
  const command = args[0] || 'check';

  switch (command) {
    case 'monitor':
    case 'watch':
      const interval = parseInt(args[1]) || 30;
      await monitor.monitor(interval);
      break;

    case 'check':
    case 'status':
    default:
      await monitor.checkOnce();
      break;

    case 'help':
      console.log('Spark Den Health Monitor');
      console.log('');
      console.log('Usage: tsx health-monitor.ts [command] [options]');
      console.log('');
      console.log('Commands:');
      console.log('  check, status    Run a single health check (default)');
      console.log('  monitor, watch   Continuously monitor health [interval_seconds]');
      console.log('  help             Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  tsx health-monitor.ts check');
      console.log('  tsx health-monitor.ts monitor 15');
      break;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Health monitor error:', error);
    process.exit(1);
  });
}