import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

export const errorRate = new Rate('errors')
export const responseTime = new Trend('response_time')
export const userCreations = new Counter('user_creations')

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 20 },   // Ramp up to 20 users
    { duration: '5m', target: 20 },   // Stay at 20 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    errors: ['rate<0.1'],
    response_time: ['p(95)<2000'],
  },
}

const BASE_URL = 'http://localhost:3000'

export default function () {
  const testData = {
    name: `User-${Math.random().toString(36).substring(7)}`,
    email: `user-${Math.random().toString(36).substring(7)}@example.com`
  }

  // Test health endpoint
  const healthResponse = http.get(`${BASE_URL}/health`)
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  })
  errorRate.add(healthResponse.status !== 200)
  responseTime.add(healthResponse.timings.duration)

  // Test metrics endpoint
  const metricsResponse = http.get(`${BASE_URL}/metrics`)
  check(metricsResponse, {
    'metrics endpoint status is 200': (r) => r.status === 200,
    'metrics response contains prometheus data': (r) => r.body.includes('# HELP'),
  })
  errorRate.add(metricsResponse.status !== 200)

  // Create user
  const createResponse = http.post(
    `${BASE_URL}/api/users`,
    JSON.stringify(testData),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )

  const createSuccess = check(createResponse, {
    'user creation status is 201': (r) => r.status === 201,
    'user creation response time < 1000ms': (r) => r.timings.duration < 1000,
    'user creation returns user object': (r) => {
      try {
        const user = JSON.parse(r.body)
        return user.id && user.name && user.email
      } catch (e) {
        return false
      }
    },
  })

  errorRate.add(createResponse.status !== 201)
  responseTime.add(createResponse.timings.duration)

  if (createSuccess) {
    userCreations.add(1)
    const user = JSON.parse(createResponse.body)

    // Get user by ID
    const getUserResponse = http.get(`${BASE_URL}/api/users/${user.id}`)
    check(getUserResponse, {
      'get user status is 200': (r) => r.status === 200,
      'get user response time < 500ms': (r) => r.timings.duration < 500,
    })
    errorRate.add(getUserResponse.status !== 200)
    responseTime.add(getUserResponse.timings.duration)

    // Update user
    const updateData = { name: `Updated-${user.name}` }
    const updateResponse = http.put(
      `${BASE_URL}/api/users/${user.id}`,
      JSON.stringify(updateData),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
    check(updateResponse, {
      'update user status is 200': (r) => r.status === 200,
      'update user response time < 1000ms': (r) => r.timings.duration < 1000,
    })
    errorRate.add(updateResponse.status !== 200)
    responseTime.add(updateResponse.timings.duration)

    // Delete user
    const deleteResponse = http.del(`${BASE_URL}/api/users/${user.id}`)
    check(deleteResponse, {
      'delete user status is 204': (r) => r.status === 204,
      'delete user response time < 500ms': (r) => r.timings.duration < 500,
    })
    errorRate.add(deleteResponse.status !== 204)
    responseTime.add(deleteResponse.timings.duration)
  }

  // Get all users
  const getAllResponse = http.get(`${BASE_URL}/api/users`)
  check(getAllResponse, {
    'get all users status is 200': (r) => r.status === 200,
    'get all users response time < 1000ms': (r) => r.timings.duration < 1000,
    'get all users returns array': (r) => {
      try {
        const users = JSON.parse(r.body)
        return Array.isArray(users)
      } catch (e) {
        return false
      }
    },
  })
  errorRate.add(getAllResponse.status !== 200)
  responseTime.add(getAllResponse.timings.duration)

  sleep(1)
}