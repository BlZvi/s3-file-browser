import { test, expect } from '../fixtures/auth';

test.describe('API: Session & Misc Endpoints', () => {
	test('get session when authenticated returns valid: true', async ({ authedRequest }) => {
		const res = await authedRequest.get('/api/auth/session');
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.valid).toBe(true);
		expect(body.region).toBeTruthy();
	});

	test('get session when not authenticated returns 401', async ({ playwright }) => {
		const context = await playwright.request.newContext({
			baseURL: 'http://localhost:5173'
		});

		const res = await context.get('/api/auth/session');
		expect(res.status()).toBe(401);

		const body = await res.json();
		expect(body.valid).toBe(false);

		await context.dispose();
	});

	test('get max presign expiry', async ({ authedRequest }) => {
		const res = await authedRequest.get('/api/s3/presign/max-expiry');
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.maxExpiry).toBe(604800); // 7 days in seconds
	});
});
