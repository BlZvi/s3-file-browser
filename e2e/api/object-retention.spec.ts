import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Object Retention', () => {
	// Object retention requires object locking enabled on the bucket.
	// These tests validate the API contract and error handling.

	test('get retention for object without retention', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/retention?bucket=${BUCKETS.test}&key=hello.txt`
		);
		// Non-locked bucket: may return 200 with null values or 500
		if (res.status() === 200) {
			const body = await res.json();
			expect(body).toHaveProperty('mode');
			expect(body).toHaveProperty('retainUntilDate');
		}
	});

	test('set retention requires valid mode', async ({ authedRequest }) => {
		const res = await authedRequest.put('/api/s3/retention', {
			data: {
				bucket: BUCKETS.versioned,
				key: 'versioned-file.txt',
				mode: 'INVALID',
				retainUntilDate: '2030-01-01T00:00:00Z'
			}
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.error).toContain('GOVERNANCE');
	});

	test('set retention requires retainUntilDate', async ({ authedRequest }) => {
		const res = await authedRequest.put('/api/s3/retention', {
			data: {
				bucket: BUCKETS.versioned,
				key: 'versioned-file.txt',
				mode: 'GOVERNANCE'
			}
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.error).toContain('retainUntilDate');
	});

	test('set retention rejects invalid date', async ({ authedRequest }) => {
		const res = await authedRequest.put('/api/s3/retention', {
			data: {
				bucket: BUCKETS.versioned,
				key: 'versioned-file.txt',
				mode: 'GOVERNANCE',
				retainUntilDate: 'not-a-date'
			}
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.error).toContain('valid date');
	});

	test('missing parameters returns 400', async ({ authedRequest }) => {
		const res1 = await authedRequest.get(
			`/api/s3/retention?bucket=${BUCKETS.versioned}`
		);
		expect(res1.status()).toBe(400);

		const res2 = await authedRequest.get(
			'/api/s3/retention?key=file.txt'
		);
		expect(res2.status()).toBe(400);

		const res3 = await authedRequest.put('/api/s3/retention', {
			data: { bucket: BUCKETS.versioned }
		});
		expect(res3.status()).toBe(400);
	});
});
