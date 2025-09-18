import { performance } from 'perf_hooks'

interface TraceSpan {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  tags: Record<string, any>
  parentSpan?: TraceSpan
}

class Tracer {
  private spans: Map<string, TraceSpan> = new Map()
  private activeSpan: TraceSpan | null = null

  startSpan(name: string, tags: Record<string, any> = {}): string {
    const spanId = `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const span: TraceSpan = {
      name,
      startTime: performance.now(),
      tags: { spanId, ...tags },
      ...(this.activeSpan && { parentSpan: this.activeSpan })
    }

    this.spans.set(spanId, span)
    this.activeSpan = span

    return spanId
  }

  finishSpan(spanId: string, tags: Record<string, any> = {}): void {
    const span = this.spans.get(spanId)
    if (!span) {
      console.warn(`Span ${spanId} not found`)
      return
    }

    span.endTime = performance.now()
    span.duration = span.endTime - span.startTime
    span.tags = { ...span.tags, ...tags }

    // Set active span to parent if this was the active span
    if (this.activeSpan === span) {
      this.activeSpan = span.parentSpan || null
    }

    console.log(`Trace: ${span.name} completed in ${span.duration.toFixed(2)}ms`, {
      spanId,
      duration: span.duration,
      tags: span.tags
    })
  }

  addTag(spanId: string, key: string, value: any): void {
    const span = this.spans.get(spanId)
    if (span) {
      span.tags[key] = value
    }
  }

  getSpan(spanId: string): TraceSpan | undefined {
    return this.spans.get(spanId)
  }

  getCurrentSpan(): TraceSpan | null {
    return this.activeSpan
  }

  async traceAsync<T>(name: string, fn: () => Promise<T>, tags: Record<string, any> = {}): Promise<T> {
    const spanId = this.startSpan(name, tags)
    try {
      const result = await fn()
      this.addTag(spanId, 'success', true)
      return result
    } catch (error) {
      this.addTag(spanId, 'success', false)
      this.addTag(spanId, 'error', error instanceof Error ? error.message : String(error))
      throw error
    } finally {
      this.finishSpan(spanId)
    }
  }

  trace<T>(name: string, fn: () => T, tags: Record<string, any> = {}): T {
    const spanId = this.startSpan(name, tags)
    try {
      const result = fn()
      this.addTag(spanId, 'success', true)
      return result
    } catch (error) {
      this.addTag(spanId, 'success', false)
      this.addTag(spanId, 'error', error instanceof Error ? error.message : String(error))
      throw error
    } finally {
      this.finishSpan(spanId)
    }
  }

  // Create a child tracer for isolated trace contexts
  createChildTracer(): Tracer {
    const childTracer = new Tracer()
    childTracer.activeSpan = this.activeSpan
    return childTracer
  }

  // Get trace summary for the current context
  getTraceSummary(): { totalSpans: number; spans: TraceSpan[] } {
    return {
      totalSpans: this.spans.size,
      spans: Array.from(this.spans.values())
    }
  }

  // Clear completed spans to prevent memory leaks
  clearCompletedSpans(): void {
    for (const [spanId, span] of this.spans.entries()) {
      if (span.endTime) {
        this.spans.delete(spanId)
      }
    }
  }
}

export const tracer = new Tracer()
export { Tracer, TraceSpan }