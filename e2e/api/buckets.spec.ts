import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: List Buckets', () => {
	test('lists all test buckets', async ({ authedRequest }) => {
		const res = await authedRequest.get('/api/s3/buckets');
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.buckets).toBeInstanceOf(Array);

		const names = body.buckets.map((b: { name: string }) => b.name);
		expect(names).toContain(BUCKETS.test);
		expect(names).toContain(BUCKETS.bulk);
		expect(names).toContain(BUCKETS.empty);
	});

	test('bucket objects have name and creationDate', async ({ authedRequest }) => {
		const res = await authedRequest.get('/api/s3/buckets');
		const body = await res.json();

		for (const bucket of body.buckets) {
			expect(bucket).toHaveProperty('name');
			expect(typeof bucket.name).toBe('string');
			expect(bucket.name.length).toBeGreaterThan(0);
			// creationDate may be undefined for some S3-compatible services
			if (bucket.creationDate) {
				expect(typeof bucket.creationDate).toBe('string');
			}
		}
	});
});
