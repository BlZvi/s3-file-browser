import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Multipart Upload', () => {
	const testKey = `multipart-test-${Date.now()}.bin`;

	test('initiate multipart upload', async ({ authedRequest }) => {
		const res = await authedRequest.post('/api/s3/multipart/initiate', {
			data: { bucket: BUCKETS.test, key: testKey, contentType: 'application/octet-stream' }
		});
		expect(res.status()).toBe(200);
		const data = await res.json();
		expect(data.uploadId).toBeTruthy();

		// Cleanup: abort the upload
		await authedRequest.post('/api/s3/multipart/abort', {
			data: { bucket: BUCKETS.test, key: testKey, uploadId: data.uploadId }
		});
	});

	test('full multipart upload lifecycle', async ({ authedRequest }) => {
		const key = `multipart-lifecycle-${Date.now()}.bin`;

		// 1. Initiate
		const initRes = await authedRequest.post('/api/s3/multipart/initiate', {
			data: { bucket: BUCKETS.test, key, contentType: 'application/octet-stream' }
		});
		expect(initRes.status()).toBe(200);
		const { uploadId } = await initRes.json();
		expect(uploadId).toBeTruthy();

		// 2. Get presigned URL for part 1
		const presignRes = await authedRequest.post('/api/s3/multipart/presign-part', {
			data: { bucket: BUCKETS.test, key, uploadId, partNumber: 1 }
		});
		expect(presignRes.status()).toBe(200);
		const { url } = await presignRes.json();
		expect(url).toContain('http');

		// 3. Upload part (minimum 5MB for non-last part, but last part can be any size)
		const partData = Buffer.alloc(1024, 'x');
		const uploadRes = await authedRequest.put(url, {
			data: partData,
			headers: { 'Content-Type': 'application/octet-stream' }
		});
		expect(uploadRes.status()).toBe(200);
		const etag = uploadRes.headers()['etag'];

		// 4. Complete
		const completeRes = await authedRequest.post('/api/s3/multipart/complete', {
			data: {
				bucket: BUCKETS.test,
				key,
				uploadId,
				parts: [{ PartNumber: 1, ETag: etag }]
			}
		});
		expect(completeRes.status()).toBe(200);

		// 5. Verify object exists
		const headRes = await authedRequest.get(
			`/api/s3/head?bucket=${BUCKETS.test}&key=${encodeURIComponent(key)}`
		);
		expect(headRes.status()).toBe(200);

		// Cleanup
		await authedRequest.post('/api/s3/delete', {
			data: { bucket: BUCKETS.test, keys: [key] }
		});
	});

	test('abort multipart upload', async ({ authedRequest }) => {
		const key = `multipart-abort-${Date.now()}.bin`;

		// Initiate
		const initRes = await authedRequest.post('/api/s3/multipart/initiate', {
			data: { bucket: BUCKETS.test, key }
		});
		const { uploadId } = await initRes.json();

		// Abort
		const abortRes = await authedRequest.post('/api/s3/multipart/abort', {
			data: { bucket: BUCKETS.test, key, uploadId }
		});
		expect(abortRes.status()).toBe(200);
	});

	test('list parts of multipart upload', async ({ authedRequest }) => {
		const key = `multipart-list-${Date.now()}.bin`;

		// Initiate
		const initRes = await authedRequest.post('/api/s3/multipart/initiate', {
			data: { bucket: BUCKETS.test, key }
		});
		const { uploadId } = await initRes.json();

		// List parts (should be empty initially)
		const listRes = await authedRequest.get(
			`/api/s3/multipart/list-parts?bucket=${BUCKETS.test}&key=${encodeURIComponent(key)}&uploadId=${uploadId}`
		);
		expect(listRes.status()).toBe(200);
		const { parts } = await listRes.json();
		expect(parts).toEqual([]);

		// Cleanup
		await authedRequest.post('/api/s3/multipart/abort', {
			data: { bucket: BUCKETS.test, key, uploadId }
		});
	});

	test('returns 400 for missing params on initiate', async ({ authedRequest }) => {
		const res = await authedRequest.post('/api/s3/multipart/initiate', {
			data: { bucket: BUCKETS.test } // missing key
		});
		expect(res.status()).toBe(400);
	});

	test('returns 400 for missing params on presign-part', async ({ authedRequest }) => {
		const res = await authedRequest.post('/api/s3/multipart/presign-part', {
			data: { bucket: BUCKETS.test, key: 'test.bin' } // missing uploadId and partNumber
		});
		expect(res.status()).toBe(400);
	});

	test('returns 400 for missing params on complete', async ({ authedRequest }) => {
		const res = await authedRequest.post('/api/s3/multipart/complete', {
			data: { bucket: BUCKETS.test, key: 'test.bin' } // missing uploadId and parts
		});
		expect(res.status()).toBe(400);
	});

	test('returns 400 for missing params on abort', async ({ authedRequest }) => {
		const res = await authedRequest.post('/api/s3/multipart/abort', {
			data: { bucket: BUCKETS.test } // missing key and uploadId
		});
		expect(res.status()).toBe(400);
	});

	test('returns 400 for missing params on list-parts', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/multipart/list-parts?bucket=${BUCKETS.test}` // missing key and uploadId
		);
		expect(res.status()).toBe(400);
	});
});
