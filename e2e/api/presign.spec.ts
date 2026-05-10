import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Presigned Share Links', () => {
	test('generate presigned URL with default expiry', async ({ authedRequest }) => {
		const res = await authedRequest.post('/api/s3/presign', {
			data: {
				bucket: BUCKETS.test,
				key: 'hello.txt'
			}
		});

		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.url).toBeTruthy();
		expect(body.expiresIn).toBe(3600); // Default 1 hour
	});

	test('generate presigned URL with custom expiry', async ({ authedRequest }) => {
		const res = await authedRequest.post('/api/s3/presign', {
			data: {
				bucket: BUCKETS.test,
				key: 'hello.txt',
				expiresIn: 300 // 5 minutes
			}
		});

		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.expiresIn).toBe(300);
	});

	test('expiry is clamped between 60s and 7 days', async ({ authedRequest }) => {
		// Too low — should be clamped to 60
		const res1 = await authedRequest.post('/api/s3/presign', {
			data: {
				bucket: BUCKETS.test,
				key: 'hello.txt',
				expiresIn: 10
			}
		});
		const body1 = await res1.json();
		expect(body1.expiresIn).toBe(60);

		// Too high — should be clamped to 604800 (7 days)
		const res2 = await authedRequest.post('/api/s3/presign', {
			data: {
				bucket: BUCKETS.test,
				key: 'hello.txt',
				expiresIn: 999999
			}
		});
		const body2 = await res2.json();
		expect(body2.expiresIn).toBe(604800);
	});

	test('presigned URL is accessible without auth', async ({ authedRequest, playwright }) => {
		// Generate presigned URL
		const res = await authedRequest.post('/api/s3/presign', {
			data: {
				bucket: BUCKETS.test,
				key: 'hello.txt'
			}
		});
		const { url } = await res.json();

		// Access without any auth cookies (new context)
		const unauthContext = await playwright.request.newContext();
		const contentRes = await unauthContext.get(url);
		expect(contentRes.ok()).toBe(true);

		const text = await contentRes.text();
		expect(text).toContain('Hello from S3 Viewer!');
		await unauthContext.dispose();
	});

	test('missing parameters returns 400', async ({ authedRequest }) => {
		const res1 = await authedRequest.post('/api/s3/presign', {
			data: { bucket: BUCKETS.test }
		});
		expect(res1.status()).toBe(400);

		const res2 = await authedRequest.post('/api/s3/presign', {
			data: { key: 'hello.txt' }
		});
		expect(res2.status()).toBe(400);
	});
});
