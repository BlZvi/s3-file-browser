import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Upload', () => {
	const testKey = `e2e-upload-test-${Date.now()}.txt`;

	test('get presigned upload URL', async ({ authedRequest }) => {
		const res = await authedRequest.post('/api/s3/upload', {
			data: {
				bucket: BUCKETS.test,
				key: testKey,
				contentType: 'text/plain'
			}
		});

		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.url).toBeTruthy();
		expect(body.url).toContain(BUCKETS.test);
	});

	test('upload file via presigned URL then verify it exists', async ({ authedRequest }) => {
		const uploadKey = `e2e-upload-verify-${Date.now()}.txt`;
		const content = 'e2e test content for upload verification';

		// Get presigned upload URL
		const presignRes = await authedRequest.post('/api/s3/upload', {
			data: {
				bucket: BUCKETS.test,
				key: uploadKey,
				contentType: 'text/plain'
			}
		});
		const { url } = await presignRes.json();

		// Upload via presigned URL (direct to MinIO)
		const uploadRes = await authedRequest.put(url, {
			data: content,
			headers: { 'Content-Type': 'text/plain' }
		});
		expect(uploadRes.ok()).toBe(true);

		// Verify the object exists via HEAD
		const headRes = await authedRequest.get(
			`/api/s3/head?bucket=${BUCKETS.test}&key=${encodeURIComponent(uploadKey)}`
		);
		expect(headRes.status()).toBe(200);
		const metadata = await headRes.json();
		expect(metadata.key).toBe(uploadKey);
		expect(metadata.size).toBeGreaterThan(0);

		// Cleanup: delete the uploaded file
		await authedRequest.post('/api/s3/delete', {
			data: { bucket: BUCKETS.test, keys: [uploadKey] }
		});
	});

	test('missing bucket or key returns 400', async ({ authedRequest }) => {
		const res = await authedRequest.post('/api/s3/upload', {
			data: { bucket: BUCKETS.test }
		});
		expect(res.status()).toBe(400);

		const res2 = await authedRequest.post('/api/s3/upload', {
			data: { key: 'test.txt' }
		});
		expect(res2.status()).toBe(400);
	});
});
