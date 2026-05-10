import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Object Tags', () => {
	test('get tags for object with no tags', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/tags?bucket=${BUCKETS.test}&key=hello.txt`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.tags).toBeDefined();
		expect(typeof body.tags).toBe('object');
	});

	test('set tags on object', async ({ authedRequest }) => {
		const res = await authedRequest.put('/api/s3/tags', {
			data: {
				bucket: BUCKETS.test,
				key: 'hello.txt',
				tags: { env: 'test', team: 'e2e' }
			}
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
	});

	test('get tags after setting them', async ({ authedRequest }) => {
		// Set tags first
		await authedRequest.put('/api/s3/tags', {
			data: {
				bucket: BUCKETS.test,
				key: 'hello.txt',
				tags: { env: 'production', version: '2.0' }
			}
		});

		// Get tags
		const res = await authedRequest.get(
			`/api/s3/tags?bucket=${BUCKETS.test}&key=hello.txt`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.tags.env).toBe('production');
		expect(body.tags.version).toBe('2.0');
	});

	test('update existing tags replaces all tags', async ({ authedRequest }) => {
		// Set initial tags
		await authedRequest.put('/api/s3/tags', {
			data: {
				bucket: BUCKETS.test,
				key: 'hello.txt',
				tags: { old: 'value' }
			}
		});

		// Replace with new tags
		await authedRequest.put('/api/s3/tags', {
			data: {
				bucket: BUCKETS.test,
				key: 'hello.txt',
				tags: { new: 'value' }
			}
		});

		// Verify old tag is gone
		const res = await authedRequest.get(
			`/api/s3/tags?bucket=${BUCKETS.test}&key=hello.txt`
		);
		const body = await res.json();
		expect(body.tags.old).toBeUndefined();
		expect(body.tags.new).toBe('value');
	});

	test('reject more than 10 tags', async ({ authedRequest }) => {
		const tags: Record<string, string> = {};
		for (let i = 1; i <= 11; i++) {
			tags[`key${i}`] = `value${i}`;
		}

		const res = await authedRequest.put('/api/s3/tags', {
			data: {
				bucket: BUCKETS.test,
				key: 'hello.txt',
				tags
			}
		});
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.error).toContain('10');
	});

	test('missing parameters returns 400', async ({ authedRequest }) => {
		const res1 = await authedRequest.get(`/api/s3/tags?bucket=${BUCKETS.test}`);
		expect(res1.status()).toBe(400);

		const res2 = await authedRequest.get('/api/s3/tags?key=hello.txt');
		expect(res2.status()).toBe(400);

		const res3 = await authedRequest.put('/api/s3/tags', {
			data: { bucket: BUCKETS.test, key: 'hello.txt' }
		});
		expect(res3.status()).toBe(400);
	});
});
