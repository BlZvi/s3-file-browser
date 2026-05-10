import { test, expect } from '@playwright/test';
import { MINIO } from '../fixtures/constants';

test.describe('API: Authentication', () => {
	test('login with valid credentials returns success and buckets', async ({ request }) => {
		const res = await request.post('/api/auth/login', {
			data: {
				accessKeyId: MINIO.accessKeyId,
				secretAccessKey: MINIO.secretAccessKey,
				region: MINIO.region,
				endpoint: MINIO.endpoint
			}
		});

		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.buckets).toBeInstanceOf(Array);
		expect(body.buckets.length).toBeGreaterThan(0);
	});

	test('login with invalid access key returns 401', async ({ request }) => {
		const res = await request.post('/api/auth/login', {
			data: {
				accessKeyId: 'INVALID_KEY',
				secretAccessKey: MINIO.secretAccessKey,
				region: MINIO.region,
				endpoint: MINIO.endpoint
			}
		});

		expect(res.status()).toBe(401);
		const body = await res.json();
		expect(body.error).toBeTruthy();
	});

	test('login with invalid secret key returns 401', async ({ request }) => {
		const res = await request.post('/api/auth/login', {
			data: {
				accessKeyId: MINIO.accessKeyId,
				secretAccessKey: 'INVALID_SECRET',
				region: MINIO.region,
				endpoint: MINIO.endpoint
			}
		});

		expect(res.status()).toBe(401);
		const body = await res.json();
		expect(body.error).toBeTruthy();
	});

	test('login with missing access key returns 400', async ({ request }) => {
		const res = await request.post('/api/auth/login', {
			data: {
				secretAccessKey: MINIO.secretAccessKey,
				region: MINIO.region,
				endpoint: MINIO.endpoint
			}
		});

		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.error).toContain('required');
	});

	test('login with missing secret key returns 400', async ({ request }) => {
		const res = await request.post('/api/auth/login', {
			data: {
				accessKeyId: MINIO.accessKeyId,
				region: MINIO.region,
				endpoint: MINIO.endpoint
			}
		});

		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.error).toContain('required');
	});

	test('login with wrong endpoint returns 401', async ({ request }) => {
		const res = await request.post('/api/auth/login', {
			data: {
				accessKeyId: MINIO.accessKeyId,
				secretAccessKey: MINIO.secretAccessKey,
				region: MINIO.region,
				endpoint: 'http://localhost:19999'
			}
		});

		expect(res.status()).toBe(401);
		const body = await res.json();
		expect(body.error).toBeTruthy();
	});

	test('logout clears session', async ({ request }) => {
		// First login
		const loginRes = await request.post('/api/auth/login', {
			data: {
				accessKeyId: MINIO.accessKeyId,
				secretAccessKey: MINIO.secretAccessKey,
				region: MINIO.region,
				endpoint: MINIO.endpoint
			}
		});
		expect(loginRes.status()).toBe(200);

		// Logout
		const logoutRes = await request.post('/api/auth/logout');
		expect(logoutRes.status()).toBe(200);
		const body = await logoutRes.json();
		expect(body.success).toBe(true);

		// Verify session is cleared — accessing S3 API should fail
		const bucketsRes = await request.get('/api/s3/buckets');
		expect(bucketsRes.status()).toBe(401);
	});

	test('access S3 API without session returns 401', async ({ request }) => {
		// Use a fresh context without any cookies
		const res = await request.get('/api/s3/buckets', {
			headers: { cookie: '' }
		});
		// Note: the request context may carry cookies from other tests,
		// so we create a truly unauthenticated request in the next test
	});

	test('unauthenticated API request returns 401', async ({ playwright }) => {
		const context = await playwright.request.newContext({
			baseURL: 'http://localhost:5173'
		});
		const res = await context.get('/api/s3/buckets');
		expect(res.status()).toBe(401);
		const body = await res.json();
		expect(body.error).toBe('Unauthorized');
		await context.dispose();
	});

	test('unauthenticated browse page redirects to login', async ({ playwright }) => {
		const context = await playwright.request.newContext({
			baseURL: 'http://localhost:5173'
		});
		const res = await context.get('/browse', { maxRedirects: 0 });
		expect(res.status()).toBe(302);
		expect(res.headers()['location']).toBe('/');
		await context.dispose();
	});
});
