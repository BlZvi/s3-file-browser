import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Download Multiple (ZIP)', () => {
	test('download 2 files as ZIP', async ({ authedRequest }) => {
		const res = await authedRequest.post('/api/s3/download-multiple', {
			data: {
				bucket: BUCKETS.test,
				keys: ['hello.txt', 'test.json']
			}
		});
		expect(res.status()).toBe(200);
		expect(res.headers()['content-type']).toContain('application/zip');
		expect(res.headers()['content-disposition']).toContain('download.zip');

		// Verify we got actual binary content
		const body = await res.body();
		expect(body.length).toBeGreaterThan(0);

		// ZIP files start with PK signature (0x50 0x4B)
		expect(body[0]).toBe(0x50);
		expect(body[1]).toBe(0x4b);
	});

	test('download with non-existent key still returns ZIP', async ({ authedRequest }) => {
		const res = await authedRequest.post('/api/s3/download-multiple', {
			data: {
				bucket: BUCKETS.test,
				keys: ['hello.txt', 'nonexistent-file-xyz.txt']
			}
		});
		// Should still succeed — non-existent files are skipped
		expect(res.status()).toBe(200);
		expect(res.headers()['content-type']).toContain('application/zip');
	});

	test('more than 100 keys returns 400', async ({ authedRequest }) => {
		const keys = Array.from({ length: 101 }, (_, i) => `file-${i}.txt`);

		const res = await authedRequest.post('/api/s3/download-multiple', {
			data: {
				bucket: BUCKETS.test,
				keys
			}
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.error).toContain('100');
	});

	test('missing parameters returns 400', async ({ authedRequest }) => {
		const res1 = await authedRequest.post('/api/s3/download-multiple', {
			data: { bucket: BUCKETS.test }
		});
		expect(res1.status()).toBe(400);

		const res2 = await authedRequest.post('/api/s3/download-multiple', {
			data: { keys: ['hello.txt'] }
		});
		expect(res2.status()).toBe(400);

		const res3 = await authedRequest.post('/api/s3/download-multiple', {
			data: { bucket: BUCKETS.test, keys: [] }
		});
		expect(res3.status()).toBe(400);
	});
});
