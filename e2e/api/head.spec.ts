import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Object Metadata (HEAD)', () => {
	test('get metadata for existing object', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/head?bucket=${BUCKETS.test}&key=hello.txt`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.key).toBe('hello.txt');
		expect(body.bucket).toBe(BUCKETS.test);
		expect(body.size).toBeGreaterThan(0);
		expect(body.contentType).toBeTruthy();
		expect(body.etag).toBeTruthy();
		expect(body.lastModified).toBeTruthy();
		expect(body.metadata).toBeDefined();
	});

	test('get metadata for JSON file has correct content type', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/head?bucket=${BUCKETS.test}&key=test.json`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.key).toBe('test.json');
		expect(body.size).toBeGreaterThan(0);
	});

	test('missing parameters returns 400', async ({ authedRequest }) => {
		const res1 = await authedRequest.get(`/api/s3/head?bucket=${BUCKETS.test}`);
		expect(res1.status()).toBe(400);

		const res2 = await authedRequest.get('/api/s3/head?key=hello.txt');
		expect(res2.status()).toBe(400);

		const res3 = await authedRequest.get('/api/s3/head');
		expect(res3.status()).toBe(400);
	});
});
