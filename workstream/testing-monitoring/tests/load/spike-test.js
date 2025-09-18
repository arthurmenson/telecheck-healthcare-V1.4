import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

export const errorRate = new Rate('spike_errors')
export const responseTime = new Trend('spike_response_time')

export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Normal load
    { duration: '10s', target: 500 },  // Sudden spike
    { duration: '30s', target: 500 },  // Maintain spike
    { duration: '10s', target: 10 },   // Return to normal
    { duration: '10s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'], // Allow very high response times during spike
    http_req_failed: ['rate<0.5'],      // Allow high error rate during spike
    spike_errors: ['rate<0.5'],
  },
}

const BASE_URL = 'http://localhost:3000'

export default function () {
  // Test system behavior under sudden traffic spike
  const responses = http.batch([
    ['GET', `${BASE_URL}/health`],
    ['GET', `${BASE_URL}/api/users`],
    ['GET', `${BASE_URL}/metrics`],
  ])

  responses.forEach((response) => {
    const isSuccess = response.status >= 200 && response.status < 400
    errorRate.add(!isSuccess)
    responseTime.add(response.timings.duration)

    check(response, {
      'response received': (r) => r.status !== 0,
      'response time under 30s': (r) => r.timings.duration < 30000,
    })
  })

  // Simulate user behavior during spike
  const userData = {
    name: `SpikeUser-${__VU}-${__ITER}`,
    email: `spike-${__VU}-${__ITER}@example.com`
  }

  const createResponse = http.post(
    `${BASE_URL}/api/users`,
    JSON.stringify(userData),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
    }
  )

  errorRate.add(createResponse.status !== 201)
  responseTime.add(createResponse.timings.duration)

  check(createResponse, {
    'user creation handled during spike': (r) => r.status === 201 || r.status === 503,
  })

  sleep(0.5)
}