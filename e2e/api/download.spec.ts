import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Download', () => {
	test('get presigned download URL for existing file', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/download?bucket=${BUCKETS.test}&key=hello.txt`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.url).toBeTruthy();
		expect(typeof body.url).toBe('string');
		// Presigned URL should point to MinIO
		expect(body.url).toContain('hello.txt');
	});

	test('download file content via presigned URL', async ({ authedRequest }) => {
		// Get presigned URL
		const res = await authedRequest.get(
			`/api/s3/download?bucket=${BUCKETS.test}&key=hello.txt`
		);
		const { url } = await res.json();

		// Fetch the actual content
		const contentRes = await authedRequest.get(url);
		expect(contentRes.ok()).toBe(true);

		const text = await contentRes.text();
		expect(text).toContain('Hello from S3 Viewer!');
	});

	test('missing parameters returns 400', async ({ authedRequest }) => {
		const res1 = await authedRequest.get('/api/s3/download?bucket=test-bucket');
		expect(res1.status()).toBe(400);

		const res2 = await authedRequest.get('/api/s3/download?key=hello.txt');
		expect(res2.status()).toBe(400);

		const res3 = await authedRequest.get('/api/s3/download');
		expect(res3.status()).toBe(400);
	});
});
