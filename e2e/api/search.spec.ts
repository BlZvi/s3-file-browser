import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Search', () => {
	test('searches recursively across folders', async ({ authedRequest }) => {
		const res = await authedRequest.get(`/api/s3/search?bucket=${BUCKETS.test}&q=hello`);
		expect(res.status()).toBe(200);
		const data = await res.json();
		expect(data.objects).toBeDefined();
		expect(Array.isArray(data.objects)).toBe(true);
		// hello.txt exists in test bucket root
		const found = data.objects.find((o: any) => o.key === 'hello.txt');
		expect(found).toBeTruthy();
	});

	test('returns 400 for missing query', async ({ authedRequest }) => {
		const res = await authedRequest.get(`/api/s3/search?bucket=${BUCKETS.test}`);
		expect(res.status()).toBe(400);
	});

	test('returns 400 for short query', async ({ authedRequest }) => {
		const res = await authedRequest.get(`/api/s3/search?bucket=${BUCKETS.test}&q=a`);
		expect(res.status()).toBe(400);
	});

	test('returns 400 for missing bucket', async ({ authedRequest }) => {
		const res = await authedRequest.get(`/api/s3/search?q=test`);
		expect(res.status()).toBe(400);
	});

	test('searches within prefix scope', async ({ authedRequest }) => {
		const res = await authedRequest.get(`/api/s3/search?bucket=${BUCKETS.test}&prefix=documents/&q=.txt`);
		expect(res.status()).toBe(200);
		const data = await res.json();
		// All results should be under documents/ prefix
		for (const obj of data.objects) {
			expect(obj.key).toMatch(/^documents\//);
		}
	});

	test('search is case-insensitive', async ({ authedRequest }) => {
		const res = await authedRequest.get(`/api/s3/search?bucket=${BUCKETS.test}&q=HELLO`);
		expect(res.status()).toBe(200);
		const data = await res.json();
		expect(data.objects.length).toBeGreaterThan(0);
	});

	test('returns totalFound in response', async ({ authedRequest }) => {
		const res = await authedRequest.get(`/api/s3/search?bucket=${BUCKETS.test}&q=hello`);
		expect(res.status()).toBe(200);
		const data = await res.json();
		expect(typeof data.totalFound).toBe('number');
		expect(data.totalFound).toBeGreaterThanOrEqual(data.objects.length);
	});

	test('search results have correct object shape', async ({ authedRequest }) => {
		const res = await authedRequest.get(`/api/s3/search?bucket=${BUCKETS.test}&q=hello`);
		expect(res.status()).toBe(200);
		const data = await res.json();
		if (data.objects.length > 0) {
			const obj = data.objects[0];
			expect(obj).toHaveProperty('key');
			expect(obj).toHaveProperty('name');
			expect(obj).toHaveProperty('size');
			expect(obj).toHaveProperty('lastModified');
			expect(obj).toHaveProperty('isFolder');
			expect(obj.isFolder).toBe(false);
		}
	});
});
