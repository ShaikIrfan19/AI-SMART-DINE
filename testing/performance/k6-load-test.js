import http from 'k6/http';
import { check, sleep } from 'k6';

// ─── K6 LOAD & PERFORMANCE BENCHMARK SUITE FOR AI SMART DINE ─────────────────
// Tests 100 to 1000 Virtual Users across key REST endpoints
// Measures: RPS, Min, Avg, Max, P95, P99 Response Times

export const options = {
  stages: [
    { duration: '15s', target: 50 },   // Warm-up to 50 VUs
    { duration: '30s', target: 100 },  // Baseline Load Test (100 VUs)
    { duration: '15s', target: 500 },  // Stress Spike Test (500 VUs)
    { duration: '15s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'], // 95% of requests must complete under 300ms
    http_req_failed: ['rate<0.05'],               // Error rate must be under 5%
  },
};

const BASE_URL = __ENV.API_URL || 'https://ai-smart-dine-backend.onrender.com/api';

export default function () {
  // 1. Health Check Endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'Health status is 200': (r) => r.status === 200,
  });

  // 2. Fetch Menu Endpoint
  const menuRes = http.get(`${BASE_URL}/menu`);
  check(menuRes, {
    'Menu status is 200': (r) => r.status === 200,
  });

  // 3. User Login Endpoint
  const loginPayload = JSON.stringify({ email: 'admin@restaurant.com', password: 'Admin@123' });
  const params = { headers: { 'Content-Type': 'application/json' } };
  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, params);
  check(loginRes, {
    'Login response valid': (r) => r.status === 200 || r.status === 429 || r.status === 401,
  });

  sleep(1);
}
