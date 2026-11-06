import { test, expect, type APIRequestContext } from '@playwright/test';
import { MINIO, BUCKETS } from '../fixtures/constants';

// Simulates an in-cluster setup: the server talks to S3 via `endpoint`, while
// the browser reaches the same S3 under a different host (`publicEndpoint`).
// 127.0.0.1 and localhost hit the same MinIO but sign differently under SigV4.
const PUBLIC_ENDPOINT = MINIO.endpoint.replace('localhost', '127.0.0.1');

test.describe('API: Public endpoint for browser-facing URLs', () => {
	let context: APIRequestContext;

	test.beforeAll(async ({ playwright }) => {
		context = await playwright.request.newContext({ baseURL: 'http://localhost:5173' });
		const loginRes = await context.post('/api/auth/login', {
			data: {
				accessKeyId: MINIO.accessKeyId,
				secretAccessKey: MINIO.secretAccessKey,
				region: MINIO.region,
				endpoint: MINIO.endpoint,
				publicEndpoint: PUBLIC_ENDPOINT
			}
		});
		expect(loginRes.ok()).toBe(true);
	});

	test.afterAll(async () => {
		await context.post('/api/auth/logout');
		await context.dispose();
	});

	test('session exposes the public endpoint and CSP allows it', async () => {
		const res = await context.get('/api/auth/session');
		const body = await res.json();
		expect(body.endpoint).toBe(MINIO.endpoint);
		expect(body.publicEndpoint).toBe(PUBLIC_ENDPOINT);

		const csp = res.headers()['content-security-policy'];
		expect(csp).toContain(new URL(PUBLIC_ENDPOINT).origin);
	});

	test('presigned download URL uses the public endpoint and is valid', async ({ playwright }) => {
		const res = await context.get(
			`/api/s3/download?bucket=${BUCKETS.test}&key=hello.txt`
		);
		const { url } = await res.json();
		expect(new URL(url).origin).toBe(new URL(PUBLIC_ENDPOINT).origin);

		const anon = await playwright.request.newContext();
		const contentRes = await anon.get(url);
		expect(contentRes.ok()).toBe(true);
		expect(await contentRes.text()).toContain('Hello from S3 Viewer!');
		await anon.dispose();
	});

	test('presigned upload URL uses the public endpoint and is valid', async ({ playwright }) => {
		const key = `public-endpoint-${Date.now()}.txt`;
		const res = await context.post('/api/s3/upload', {
			data: { bucket: BUCKETS.test, key, contentType: 'text/plain' }
		});
		const { url } = await res.json();
		expect(new URL(url).origin).toBe(new URL(PUBLIC_ENDPOINT).origin);

		const anon = await playwright.request.newContext();
		const putRes = await anon.put(url, {
			data: 'via public endpoint',
			headers: { 'Content-Type': 'text/plain' }
		});
		expect(putRes.ok()).toBe(true);
		await anon.dispose();

		await context.post('/api/s3/delete', { data: { bucket: BUCKETS.test, keys: [key] } });
	});

	test('share link uses the public endpoint', async () => {
		const res = await context.post('/api/s3/presign', {
			data: { bucket: BUCKETS.test, key: 'hello.txt' }
		});
		const { url } = await res.json();
		expect(new URL(url).origin).toBe(new URL(PUBLIC_ENDPOINT).origin);
	});
});
