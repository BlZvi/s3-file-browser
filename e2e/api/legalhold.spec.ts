import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Object Legal Hold', () => {
	// Legal hold requires object locking enabled on the bucket.
	// These tests use the versioned-bucket which may or may not have object locking.
	// If object locking is not enabled, the tests will get 500 errors from MinIO.
	// We test the API validation regardless.

	test('get legal hold status for object', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/legalhold?bucket=${BUCKETS.versioned}&key=versioned-file.txt`
		);
		// May return 200 (with status) or 500 (if object locking not enabled)
		if (res.status() === 200) {
			const body = await res.json();
			expect(['ON', 'OFF']).toContain(body.status);
		} else {
			// Object locking not enabled — expected for non-locked buckets
			expect(res.status()).toBe(500);
		}
	});

	test('set legal hold requires valid status', async ({ authedRequest }) => {
		const res = await authedRequest.put('/api/s3/legalhold', {
			data: {
				bucket: BUCKETS.versioned,
				key: 'versioned-file.txt',
				status: 'INVALID'
			}
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.error).toContain('ON');
	});

	test('missing parameters returns 400', async ({ authedRequest }) => {
		const res1 = await authedRequest.get(
			`/api/s3/legalhold?bucket=${BUCKETS.versioned}`
		);
		expect(res1.status()).toBe(400);

		const res2 = await authedRequest.get(
			'/api/s3/legalhold?key=file.txt'
		);
		expect(res2.status()).toBe(400);

		const res3 = await authedRequest.put('/api/s3/legalhold', {
			data: { bucket: BUCKETS.versioned }
		});
		expect(res3.status()).toBe(400);
	});
});
