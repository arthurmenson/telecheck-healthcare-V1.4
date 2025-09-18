import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

export const errorRate = new Rate('stress_errors')
export const responseTime = new Trend('stress_response_time')
export const requests = new Counter('stress_requests')

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Quickly ramp up to 50 users
    { duration: '3m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 200 },  // Stress test with 200 users
    { duration: '3m', target: 100 },  // Ramp down to 100 users
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // Allow higher response times under stress
    http_req_failed: ['rate<0.2'],     // Allow higher error rate under stress
    stress_errors: ['rate<0.2'],
    stress_response_time: ['p(95)<5000'],
  },
}

const BASE_URL = 'http://localhost:3000'

export default function () {
  requests.add(1)

  // Heavy load on user creation
  const userData = {
    name: `StressUser-${__VU}-${__ITER}`,
    email: `stress-${__VU}-${__ITER}@example.com`
  }

  const responses = http.batch([
    ['GET', `${BASE_URL}/health`],
    ['GET', `${BASE_URL}/api/users`],
    ['POST', `${BASE_URL}/api/users`, JSON.stringify(userData), {
      headers: { 'Content-Type': 'application/json' }
    }],
    ['GET', `${BASE_URL}/metrics`],
  ])

  responses.forEach((response, index) => {
    const isSuccess = response.status >= 200 && response.status < 400
    errorRate.add(!isSuccess)
    responseTime.add(response.timings.duration)

    check(response, {
      [`request ${index} completed`]: (r) => r.status !== 0,
      [`request ${index} response time acceptable`]: (r) => r.timings.duration < 10000,
    })
  })

  // Create multiple users rapidly
  for (let i = 0; i < 3; i++) {
    const rapidUserData = {
      name: `RapidUser-${__VU}-${__ITER}-${i}`,
      email: `rapid-${__VU}-${__ITER}-${i}@example.com`
    }

    const createResponse = http.post(
      `${BASE_URL}/api/users`,
      JSON.stringify(rapidUserData),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )

    errorRate.add(createResponse.status !== 201)
    responseTime.add(createResponse.timings.duration)
    requests.add(1)
  }

  sleep(0.1) // Short sleep to maintain high load
}

export function teardown() {
  console.log('Stress test completed')
}