import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Delete', () => {
	test('delete single object', async ({ authedRequest }) => {
		// First, create a file to delete
		const key = `e2e-delete-single-${Date.now()}.txt`;
		const presignRes = await authedRequest.post('/api/s3/upload', {
			data: { bucket: BUCKETS.test, key, contentType: 'text/plain' }
		});
		const { url } = await presignRes.json();
		await authedRequest.put(url, {
			data: 'delete me',
			headers: { 'Content-Type': 'text/plain' }
		});

		// Delete it
		const deleteRes = await authedRequest.post('/api/s3/delete', {
			data: { bucket: BUCKETS.test, keys: [key] }
		});
		expect(deleteRes.status()).toBe(200);
		const body = await deleteRes.json();
		expect(body.success).toBe(true);
		expect(body.deleted).toBe(1);

		// Verify it's gone — HEAD should fail
		const headRes = await authedRequest.get(
			`/api/s3/head?bucket=${BUCKETS.test}&key=${encodeURIComponent(key)}`
		);
		expect(headRes.status()).toBe(404); // Object not found
	});

	test('delete multiple objects', async ({ authedRequest }) => {
		// Create 3 files
		const keys = [
			`e2e-delete-multi-1-${Date.now()}.txt`,
			`e2e-delete-multi-2-${Date.now()}.txt`,
			`e2e-delete-multi-3-${Date.now()}.txt`
		];

		for (const key of keys) {
			const presignRes = await authedRequest.post('/api/s3/upload', {
				data: { bucket: BUCKETS.test, key, contentType: 'text/plain' }
			});
			const { url } = await presignRes.json();
			await authedRequest.put(url, {
				data: 'delete me',
				headers: { 'Content-Type': 'text/plain' }
			});
		}

		// Delete all 3
		const deleteRes = await authedRequest.post('/api/s3/delete', {
			data: { bucket: BUCKETS.test, keys }
		});
		expect(deleteRes.status()).toBe(200);
		const body = await deleteRes.json();
		expect(body.success).toBe(true);
		expect(body.deleted).toBe(3);
	});

	test('missing or empty keys array returns 400', async ({ authedRequest }) => {
		const res1 = await authedRequest.post('/api/s3/delete', {
			data: { bucket: BUCKETS.test }
		});
		expect(res1.status()).toBe(400);

		const res2 = await authedRequest.post('/api/s3/delete', {
			data: { bucket: BUCKETS.test, keys: [] }
		});
		expect(res2.status()).toBe(400);

		const res3 = await authedRequest.post('/api/s3/delete', {
			data: { keys: ['test.txt'] }
		});
		expect(res3.status()).toBe(400);
	});
});
