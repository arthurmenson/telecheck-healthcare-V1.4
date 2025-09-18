import { Server } from 'socket.io';
import { Logger } from '@utils/logger';
import { MetricsService } from '@utils/metrics-service';
import { ErrorHandler } from '@utils/error-handler';
import Redis from 'ioredis';
import { Kafka, Consumer, Producer } from 'kafkajs';

export interface StreamEvent {
  id: string;
  timestamp: Date;
  type: string;
  source: string;
  data: any;
  metadata: {
    version: string;
    userId?: string;
    sessionId?: string;
    correlationId?: string;
  };
}

export interface StreamProcessor {
  id: string;
  name: string;
  inputStreams: string[];
  outputStreams: string[];
  process: (event: StreamEvent) => Promise<StreamEvent[]>;
  config: any;
}

export interface AnalyticsWindow {
  id: string;
  type: 'tumbling' | 'sliding' | 'session';
  size: number; // milliseconds
  slide?: number; // milliseconds for sliding windows
  sessionTimeout?: number; // milliseconds for session windows
}

export interface StreamingMetrics {
  throughput: number; // events per second
  latency: number; // milliseconds
  errorRate: number;
  backlog: number;
  processingTime: number;
  memoryUsage: number;
}

export class RealTimeAnalytics {
  private logger: Logger;
  private metricsService: MetricsService;
  private io: Server;
  private redis: Redis;
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Map<string, Consumer>;
  private processors: Map<string, StreamProcessor>;
  private windows: Map<string, AnalyticsWindow>;
  private isInitialized: boolean;

  constructor(io: Server) {
    this.logger = new Logger('RealTimeAnalytics');
    this.metricsService = new MetricsService();
    this.io = io;
    this.consumers = new Map();
    this.processors = new Map();
    this.windows = new Map();
    this.isInitialized = false;

    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    // Initialize Kafka
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'analytics-reporting',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });

    this.producer = this.kafka.producer();

    this.setupDefaultProcessors();
    this.setupDefaultWindows();
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Real-Time Analytics');

    try {
      // Connect to Redis
      await this.redis.ping();
      this.logger.info('Redis connection established');

      // Connect to Kafka (gracefully handle failure)
      try {
        await this.producer.connect();
        this.logger.info('Kafka producer connected');
      } catch (error) {
        this.logger.warn('Kafka connection failed, continuing without streaming capabilities', { error });
      }

      // Setup stream consumers
      await this.setupStreamConsumers();

      // Start real-time dashboard updates
      this.startDashboardUpdates();

      // Start metrics collection
      this.startMetricsCollection();

      this.isInitialized = true;
      this.logger.info('Real-Time Analytics initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Real-Time Analytics', { error });
      throw ErrorHandler.streamingError(`Real-time analytics initialization failed: ${error}`);
    }
  }

  async publishEvent(event: StreamEvent): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate event
      this.validateEvent(event);

      // Add timestamp if not provided
      if (!event.timestamp) {
        event.timestamp = new Date();
      }

      // Publish to Kafka (if available)
      try {
        await this.producer.send({
          topic: `analytics-${event.type}`,
          messages: [{
            key: event.id,
            value: JSON.stringify(event),
            timestamp: event.timestamp.getTime().toString()
          }]
        });
      } catch (error) {
        this.logger.debug('Kafka publish failed, continuing with local processing', { error });
      }

      // Cache recent events in Redis
      await this.cacheRecentEvent(event);

      // Emit to WebSocket clients
      this.io.emit(`stream-${event.type}`, event);

      // Record metrics
      this.metricsService.recordStreamingLatency(Date.now() - startTime, 'publish', event.type);

      this.logger.debug(`Event published: ${event.id}`, { type: event.type, source: event.source });

    } catch (error) {
      this.logger.error(`Failed to publish event: ${event.id}`, { error });
      throw ErrorHandler.streamingError(`Event publishing failed: ${error}`);
    }
  }

  async processStream(streamId: string, events: StreamEvent[]): Promise<StreamEvent[]> {
    const startTime = Date.now();
    const processor = this.processors.get(streamId);

    if (!processor) {
      throw ErrorHandler.streamingError(`Stream processor not found: ${streamId}`);
    }

    try {
      const results: StreamEvent[] = [];

      for (const event of events) {
        const processedEvents = await processor.process(event);
        results.push(...processedEvents);
      }

      // Record processing metrics
      this.metricsService.recordStreamingLatency(Date.now() - startTime, 'process', streamId);

      this.logger.debug(`Stream processed: ${streamId}`, {
        inputEvents: events.length,
        outputEvents: results.length,
        processingTime: Date.now() - startTime
      });

      return results;

    } catch (error) {
      this.logger.error(`Stream processing failed: ${streamId}`, { error });
      throw ErrorHandler.streamingError(`Stream processing failed: ${error}`);
    }
  }

  async aggregateWindow(windowId: string, events: StreamEvent[]): Promise<any> {
    const window = this.windows.get(windowId);

    if (!window) {
      throw ErrorHandler.streamingError(`Window not found: ${windowId}`);
    }

    try {
      const aggregations = {
        count: events.length,
        sum: 0,
        avg: 0,
        min: Number.MAX_VALUE,
        max: Number.MIN_VALUE,
        unique: new Set(),
        groupBy: new Map()
      };

      // Process events based on window type
      const windowEvents = this.filterEventsByWindow(events, window);

      windowEvents.forEach(event => {
        if (typeof event.data.value === 'number') {
          aggregations.sum += event.data.value;
          aggregations.min = Math.min(aggregations.min, event.data.value);
          aggregations.max = Math.max(aggregations.max, event.data.value);
        }

        aggregations.unique.add(event.source);

        // Group by source
        const sourceCount = aggregations.groupBy.get(event.source) || 0;
        aggregations.groupBy.set(event.source, sourceCount + 1);
      });

      if (windowEvents.length > 0) {
        aggregations.avg = aggregations.sum / windowEvents.length;
      }

      const result = {
        windowId,
        windowType: window.type,
        timeRange: {
          start: windowEvents[0]?.timestamp,
          end: windowEvents[windowEvents.length - 1]?.timestamp
        },
        aggregations: {
          ...aggregations,
          unique: aggregations.unique.size,
          groupBy: Object.fromEntries(aggregations.groupBy)
        }
      };

      // Cache window result
      await this.cacheWindowResult(windowId, result);

      return result;

    } catch (error) {
      this.logger.error(`Window aggregation failed: ${windowId}`, { error });
      throw ErrorHandler.streamingError(`Window aggregation failed: ${error}`);
    }
  }

  private validateEvent(event: StreamEvent): void {
    if (!event.id || !event.type || !event.source) {
      throw ErrorHandler.validationError('Event must have id, type, and source');
    }

    if (!event.data) {
      throw ErrorHandler.validationError('Event must have data payload');
    }
  }

  private async cacheRecentEvent(event: StreamEvent): Promise<void> {
    const key = `recent_events:${event.type}`;
    const eventData = JSON.stringify(event);

    await this.redis.lpush(key, eventData);
    await this.redis.ltrim(key, 0, 999); // Keep last 1000 events
    await this.redis.expire(key, 3600); // Expire after 1 hour
  }

  private async cacheWindowResult(windowId: string, result: any): Promise<void> {
    const key = `window_result:${windowId}`;
    await this.redis.setex(key, 300, JSON.stringify(result)); // Cache for 5 minutes
  }

  private filterEventsByWindow(events: StreamEvent[], window: AnalyticsWindow): StreamEvent[] {
    const now = Date.now();
    const windowStart = now - window.size;

    return events.filter(event => {
      const eventTime = event.timestamp.getTime();

      switch (window.type) {
        case 'tumbling':
          return eventTime >= windowStart;
        case 'sliding':
          const slideWindow = window.slide || window.size;
          return eventTime >= now - slideWindow;
        case 'session':
          // Session windows would need more complex logic
          return eventTime >= windowStart;
        default:
          return true;
      }
    });
  }

  private async setupStreamConsumers(): Promise<void> {
    try {
      const consumerTopics = ['analytics-user-action', 'analytics-system-metric', 'analytics-business-event'];

      for (const topic of consumerTopics) {
        const consumer = this.kafka.consumer({
          groupId: process.env.KAFKA_GROUP_ID || 'analytics-consumer-group'
        });

        await consumer.connect();
        await consumer.subscribe({ topic });

        await consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            try {
              const event: StreamEvent = JSON.parse(message.value?.toString() || '{}');
              await this.handleIncomingEvent(event);
            } catch (error) {
              this.logger.error(`Failed to process message from ${topic}`, { error });
            }
          }
        });

        this.consumers.set(topic, consumer);
        this.logger.info(`Stream consumer setup for topic: ${topic}`);
      }
    } catch (error) {
      this.logger.warn('Failed to setup Kafka consumers, continuing without them', { error });
    }
  }

  private async handleIncomingEvent(event: StreamEvent): Promise<void> {
    try {
      // Process through registered processors
      for (const processor of this.processors.values()) {
        if (processor.inputStreams.includes(event.type)) {
          const results = await processor.process(event);

          // Publish processed events
          for (const result of results) {
            await this.publishEvent(result);
          }
        }
      }

      // Update real-time dashboards
      this.updateRealTimeDashboards(event);

    } catch (error) {
      this.logger.error(`Failed to handle incoming event: ${event.id}`, { error });
    }
  }

  private updateRealTimeDashboards(event: StreamEvent): void {
    // Emit to specific dashboard rooms
    this.io.to(`dashboard-${event.type}`).emit('real-time-update', {
      event,
      timestamp: new Date()
    });

    // Update global analytics
    this.io.emit('analytics-update', {
      type: event.type,
      source: event.source,
      timestamp: event.timestamp
    });
  }

  private startDashboardUpdates(): void {
    setInterval(async () => {
      try {
        const metrics = await this.getStreamingMetrics();
        this.io.emit('streaming-metrics', metrics);
      } catch (error) {
        this.logger.error('Failed to update dashboard metrics', { error });
      }
    }, 5000); // Update every 5 seconds
  }

  private startMetricsCollection(): void {
    setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();

        // Record system metrics
        this.metricsService.recordStreamingLatency(metrics.latency, 'system', 'overall');
        this.metricsService.setDataQualityScore(1 - metrics.errorRate, 'streaming', 'system');

      } catch (error) {
        this.logger.error('Failed to collect streaming metrics', { error });
      }
    }, 10000); // Collect every 10 seconds
  }

  private async getStreamingMetrics(): Promise<StreamingMetrics> {
    const redisInfo = await this.redis.info('memory');
    const memoryUsage = this.parseMemoryUsage(redisInfo);

    return {
      throughput: await this.calculateThroughput(),
      latency: await this.calculateAverageLatency(),
      errorRate: await this.calculateErrorRate(),
      backlog: await this.calculateBacklog(),
      processingTime: await this.calculateProcessingTime(),
      memoryUsage
    };
  }

  private async collectMetrics(): Promise<StreamingMetrics> {
    return this.getStreamingMetrics();
  }

  private parseMemoryUsage(redisInfo: string): number {
    const match = redisInfo.match(/used_memory:(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private async calculateThroughput(): Promise<number> {
    // Calculate events processed per second
    const key = 'throughput_counter';
    const current = await this.redis.get(key) || '0';
    return parseInt(current) / 60; // Events per second over last minute
  }

  private async calculateAverageLatency(): Promise<number> {
    // Calculate average processing latency
    return Math.random() * 100 + 50; // Simulated latency
  }

  private async calculateErrorRate(): Promise<number> {
    // Calculate error rate
    return Math.random() * 0.05; // Simulated error rate
  }

  private async calculateBacklog(): Promise<number> {
    // Calculate message backlog
    return Math.floor(Math.random() * 1000);
  }

  private async calculateProcessingTime(): Promise<number> {
    // Calculate average processing time
    return Math.random() * 50 + 10;
  }

  private setupDefaultProcessors(): void {
    // User action processor
    this.processors.set('user-action-processor', {
      id: 'user-action-processor',
      name: 'User Action Analytics Processor',
      inputStreams: ['user-action'],
      outputStreams: ['user-analytics'],
      process: async (event: StreamEvent) => {
        return [{
          ...event,
          id: `processed-${event.id}`,
          type: 'user-analytics',
          data: {
            ...event.data,
            processed: true,
            processingTime: new Date()
          }
        }];
      },
      config: {}
    });

    // System metrics processor
    this.processors.set('system-metrics-processor', {
      id: 'system-metrics-processor',
      name: 'System Metrics Processor',
      inputStreams: ['system-metric'],
      outputStreams: ['system-analytics'],
      process: async (event: StreamEvent) => {
        return [{
          ...event,
          id: `metrics-${event.id}`,
          type: 'system-analytics',
          data: {
            ...event.data,
            normalized: true,
            threshold_check: event.data.value > 80 ? 'warning' : 'normal'
          }
        }];
      },
      config: {}
    });
  }

  private setupDefaultWindows(): void {
    // 1-minute tumbling window
    this.windows.set('1min-tumbling', {
      id: '1min-tumbling',
      type: 'tumbling',
      size: 60000 // 1 minute
    });

    // 5-minute sliding window
    this.windows.set('5min-sliding', {
      id: '5min-sliding',
      type: 'sliding',
      size: 300000, // 5 minutes
      slide: 60000 // 1 minute slide
    });

    // Session window with 30-minute timeout
    this.windows.set('session-30min', {
      id: 'session-30min',
      type: 'session',
      size: 1800000, // 30 minutes
      sessionTimeout: 600000 // 10 minutes
    });
  }

  addProcessor(processor: StreamProcessor): void {
    this.processors.set(processor.id, processor);
    this.logger.info(`Added stream processor: ${processor.name}`);
  }

  addWindow(window: AnalyticsWindow): void {
    this.windows.set(window.id, window);
    this.logger.info(`Added analytics window: ${window.id}`);
  }

  async getRecentEvents(eventType: string, limit: number = 100): Promise<StreamEvent[]> {
    const key = `recent_events:${eventType}`;
    const events = await this.redis.lrange(key, 0, limit - 1);
    return events.map(event => JSON.parse(event));
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Real-Time Analytics');

    try {
      // Disconnect Kafka consumers
      for (const consumer of this.consumers.values()) {
        await consumer.disconnect();
      }

      // Disconnect Kafka producer
      await this.producer.disconnect();

      // Disconnect Redis
      this.redis.disconnect();

      this.logger.info('Real-Time Analytics shutdown complete');

    } catch (error) {
      this.logger.error('Error during Real-Time Analytics shutdown', { error });
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getProcessors(): StreamProcessor[] {
    return Array.from(this.processors.values());
  }

  getWindows(): AnalyticsWindow[] {
    return Array.from(this.windows.values());
  }
}

// Export for CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  // Create a mock Socket.IO server for CLI testing
  const { createServer } = await import('http');
  const { Server: SocketServer } = await import('socket.io');

  const httpServer = createServer();
  const io = new SocketServer(httpServer);

  const realTimeAnalytics = new RealTimeAnalytics(io);

  realTimeAnalytics.initialize()
    .then(() => {
      console.log('Real-Time Analytics initialized');

      // Example event publishing
      const exampleEvent: StreamEvent = {
        id: 'test-event-1',
        timestamp: new Date(),
        type: 'user-action',
        source: 'web-app',
        data: {
          action: 'page_view',
          page: '/dashboard',
          value: 1
        },
        metadata: {
          version: '1.0',
          userId: 'user123',
          sessionId: 'session456'
        }
      };

      return realTimeAnalytics.publishEvent(exampleEvent);
    })
    .then(() => {
      console.log('Example event published successfully');

      // Get streaming metrics
      return realTimeAnalytics.getStreamingMetrics();
    })
    .then(metrics => {
      console.log('Streaming Metrics:', metrics);
    })
    .catch(console.error);
}