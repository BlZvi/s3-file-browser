import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Bucket Configuration', () => {
	// Use a dedicated bucket for config tests to avoid interfering with other tests
	const configBucket = `e2e-config-bucket-${Date.now()}`;

	test.beforeAll(async ({ authedRequest }) => {
		await authedRequest.post('/api/s3/buckets', {
			data: { name: configBucket }
		});
	});

	test.afterAll(async ({ authedRequest }) => {
		try {
			await authedRequest.delete('/api/s3/buckets', {
				data: { name: configBucket }
			});
		} catch {
			// Ignore cleanup errors
		}
	});

	// ── Versioning ──────────────────────────────────────────────────────

	test('get bucket versioning status', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/buckets/versioning?bucket=${configBucket}`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(['Enabled', 'Suspended', 'Disabled']).toContain(body.status);
	});

	test('enable bucket versioning', async ({ authedRequest }) => {
		const res = await authedRequest.put('/api/s3/buckets/versioning', {
			data: { bucket: configBucket, enabled: true }
		});
		expect(res.status()).toBe(200);

		// Verify
		const getRes = await authedRequest.get(
			`/api/s3/buckets/versioning?bucket=${configBucket}`
		);
		const body = await getRes.json();
		expect(body.status).toBe('Enabled');
	});

	// ── Bucket Info ─────────────────────────────────────────────────────

	test('get bucket info aggregate', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/buckets/info?bucket=${BUCKETS.test}`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.name).toBe(BUCKETS.test);
		expect(body).toHaveProperty('versioning');
		expect(body).toHaveProperty('objectLocking');
		expect(body).toHaveProperty('tags');
	});

	// ── Bucket Tags ─────────────────────────────────────────────────────

	test('get bucket tags (empty)', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/buckets/tags?bucket=${configBucket}`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.tags).toBeDefined();
		expect(typeof body.tags).toBe('object');
	});

	test('set bucket tags', async ({ authedRequest }) => {
		const res = await authedRequest.put('/api/s3/buckets/tags', {
			data: {
				bucket: configBucket,
				tags: { environment: 'e2e-test', team: 'qa' }
			}
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
	});

	test('get bucket tags after setting', async ({ authedRequest }) => {
		// Set tags first
		await authedRequest.put('/api/s3/buckets/tags', {
			data: {
				bucket: configBucket,
				tags: { env: 'staging' }
			}
		});

		const res = await authedRequest.get(
			`/api/s3/buckets/tags?bucket=${configBucket}`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.tags.env).toBe('staging');
	});

	test('delete bucket tags', async ({ authedRequest }) => {
		// Set tags first
		await authedRequest.put('/api/s3/buckets/tags', {
			data: {
				bucket: configBucket,
				tags: { temp: 'value' }
			}
		});

		// Delete tags
		const res = await authedRequest.delete(
			`/api/s3/buckets/tags?bucket=${configBucket}`
		);
		expect(res.status()).toBe(200);

		// Verify tags are gone
		const getRes = await authedRequest.get(
			`/api/s3/buckets/tags?bucket=${configBucket}`
		);
		const body = await getRes.json();
		expect(Object.keys(body.tags).length).toBe(0);
	});

	// ── Bucket Policy ───────────────────────────────────────────────────

	test('get bucket policy (none)', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/buckets/policy?bucket=${configBucket}`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		// Policy should be null or empty when not set
		expect(body.policy === null || body.policy === '').toBe(true);
	});

	test('set bucket policy', async ({ authedRequest }) => {
		const policy = JSON.stringify({
			Version: '2012-10-17',
			Statement: [
				{
					Effect: 'Allow',
					Principal: { AWS: ['*'] },
					Action: ['s3:GetObject'],
					Resource: [`arn:aws:s3:::${configBucket}/*`]
				}
			]
		});

		const res = await authedRequest.put('/api/s3/buckets/policy', {
			data: { bucket: configBucket, policy }
		});
		expect(res.status()).toBe(200);
	});

	test('delete bucket policy', async ({ authedRequest }) => {
		// Set a policy first
		const policy = JSON.stringify({
			Version: '2012-10-17',
			Statement: [
				{
					Effect: 'Allow',
					Principal: { AWS: ['*'] },
					Action: ['s3:GetObject'],
					Resource: [`arn:aws:s3:::${configBucket}/*`]
				}
			]
		});
		await authedRequest.put('/api/s3/buckets/policy', {
			data: { bucket: configBucket, policy }
		});

		// Delete it
		const res = await authedRequest.delete(
			`/api/s3/buckets/policy?bucket=${configBucket}`
		);
		expect(res.status()).toBe(200);
	});

	// ── Bucket Retention ────────────────────────────────────────────────

	test('get bucket retention config', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/buckets/retention?bucket=${configBucket}`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body).toHaveProperty('enabled');
	});

	// ── Missing Parameters ──────────────────────────────────────────────

	test('missing bucket returns 400 for versioning', async ({ authedRequest }) => {
		const res = await authedRequest.get('/api/s3/buckets/versioning');
		expect(res.status()).toBe(400);
	});

	test('missing bucket returns 400 for info', async ({ authedRequest }) => {
		const res = await authedRequest.get('/api/s3/buckets/info');
		expect(res.status()).toBe(400);
	});

	test('missing bucket returns 400 for tags', async ({ authedRequest }) => {
		const res = await authedRequest.get('/api/s3/buckets/tags');
		expect(res.status()).toBe(400);
	});
});
