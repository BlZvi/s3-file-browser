import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Pagination', () => {
	test('returns isTruncated when maxKeys limits results', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/objects?bucket=${BUCKETS.bulk}&prefix=&maxKeys=5`
		);
		expect(res.status()).toBe(200);
		const data = await res.json();
		expect(data.objects.length).toBeLessThanOrEqual(5);
		expect(data.isTruncated).toBe(true);
		expect(data.continuationToken).toBeTruthy();
	});

	test('continuationToken loads next page', async ({ authedRequest }) => {
		// First page
		const res1 = await authedRequest.get(
			`/api/s3/objects?bucket=${BUCKETS.bulk}&prefix=&maxKeys=5`
		);
		const data1 = await res1.json();
		expect(data1.isTruncated).toBe(true);
		expect(data1.continuationToken).toBeTruthy();

		// Second page
		const res2 = await authedRequest.get(
			`/api/s3/objects?bucket=${BUCKETS.bulk}&prefix=&maxKeys=5&continuationToken=${encodeURIComponent(data1.continuationToken)}`
		);
		expect(res2.status()).toBe(200);
		const data2 = await res2.json();
		expect(data2.objects.length).toBeGreaterThan(0);

		// Ensure no duplicates between pages
		const keys1 = data1.objects.map((o: { key: string }) => o.key);
		const keys2 = data2.objects.map((o: { key: string }) => o.key);
		const overlap = keys1.filter((k: string) => keys2.includes(k));
		expect(overlap.length).toBe(0);
	});

	test('returns all objects when maxKeys is large enough', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/objects?bucket=${BUCKETS.test}&prefix=&maxKeys=1000`
		);
		expect(res.status()).toBe(200);
		const data = await res.json();
		expect(data.isTruncated).toBe(false);
		expect(data.continuationToken).toBeFalsy();
	});

	test('defaults maxKeys to 1000 when not specified', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/objects?bucket=${BUCKETS.test}&prefix=`
		);
		expect(res.status()).toBe(200);
		const data = await res.json();
		// test-bucket has few objects, so should not be truncated with default maxKeys=1000
		expect(data.isTruncated).toBe(false);
	});

	test('respects maxKeys=1 returning at most 1 object', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/objects?bucket=${BUCKETS.bulk}&prefix=&maxKeys=1`
		);
		expect(res.status()).toBe(200);
		const data = await res.json();
		// Should have at most 1 item (could be folder or file)
		expect(data.objects.length).toBeLessThanOrEqual(1);
		expect(data.isTruncated).toBe(true);
	});
});
