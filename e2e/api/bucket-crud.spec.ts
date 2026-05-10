import { test, expect } from '../fixtures/auth';

test.describe('API: Bucket Create/Delete', () => {
	const testBucketName = `e2e-crud-bucket-${Date.now()}`;

	test('create bucket', async ({ authedRequest }) => {
		const res = await authedRequest.post('/api/s3/buckets', {
			data: { name: testBucketName }
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
	});

	test('created bucket appears in listing', async ({ authedRequest }) => {
		// Create a bucket
		const bucketName = `e2e-list-bucket-${Date.now()}`;
		await authedRequest.post('/api/s3/buckets', {
			data: { name: bucketName }
		});

		// Verify it appears in listing
		const listRes = await authedRequest.get('/api/s3/buckets');
		const body = await listRes.json();
		const names = body.buckets.map((b: { name: string }) => b.name);
		expect(names).toContain(bucketName);

		// Cleanup
		await authedRequest.delete('/api/s3/buckets', {
			data: { name: bucketName }
		});
	});

	test('create bucket with versioning', async ({ authedRequest }) => {
		const bucketName = `e2e-versioned-${Date.now()}`;

		const res = await authedRequest.post('/api/s3/buckets', {
			data: { name: bucketName, versioning: true }
		});
		expect(res.status()).toBe(200);

		// Verify versioning is enabled
		const versionRes = await authedRequest.get(
			`/api/s3/buckets/versioning?bucket=${bucketName}`
		);
		const versionBody = await versionRes.json();
		expect(versionBody.status).toBe('Enabled');

		// Cleanup
		await authedRequest.delete('/api/s3/buckets', {
			data: { name: bucketName }
		});
	});

	test('delete empty bucket', async ({ authedRequest }) => {
		// Create a bucket to delete
		const bucketName = `e2e-delete-bucket-${Date.now()}`;
		await authedRequest.post('/api/s3/buckets', {
			data: { name: bucketName }
		});

		// Delete it
		const res = await authedRequest.delete('/api/s3/buckets', {
			data: { name: bucketName }
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);

		// Verify it's gone
		const listRes = await authedRequest.get('/api/s3/buckets');
		const listBody = await listRes.json();
		const names = listBody.buckets.map((b: { name: string }) => b.name);
		expect(names).not.toContain(bucketName);
	});

	test('missing name returns 400', async ({ authedRequest }) => {
		const res1 = await authedRequest.post('/api/s3/buckets', {
			data: {}
		});
		expect(res1.status()).toBe(400);

		const res2 = await authedRequest.delete('/api/s3/buckets', {
			data: {}
		});
		expect(res2.status()).toBe(400);
	});

	// Cleanup the test bucket created in the first test
	test.afterAll(async ({ authedRequest }) => {
		try {
			await authedRequest.delete('/api/s3/buckets', {
				data: { name: testBucketName }
			});
		} catch {
			// Ignore cleanup errors
		}
	});
});
