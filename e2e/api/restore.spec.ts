import { test, expect } from '../fixtures/auth';
import { BUCKETS, VERSIONED_BUCKET } from '../fixtures/constants';

test.describe('API: Restore Object Version', () => {
	test('restore previous version', async ({ authedRequest }) => {
		// Get versions to find a non-latest version
		const versionsRes = await authedRequest.get(
			`/api/s3/versions?bucket=${BUCKETS.versioned}&prefix=${VERSIONED_BUCKET.versionedFile}`
		);
		const { versions } = await versionsRes.json();
		const oldVersion = versions.find((v: any) => !v.isLatest);

		if (!oldVersion) {
			test.skip();
			return;
		}

		// Restore the old version
		const res = await authedRequest.post('/api/s3/restore', {
			data: {
				bucket: BUCKETS.versioned,
				key: VERSIONED_BUCKET.versionedFile,
				versionId: oldVersion.versionId
			}
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.success).toBe(true);
	});

	test('verify restored content creates new version', async ({ authedRequest }) => {
		// Get current version count
		const beforeRes = await authedRequest.get(
			`/api/s3/versions?bucket=${BUCKETS.versioned}&prefix=${VERSIONED_BUCKET.versionedFile}`
		);
		const beforeBody = await beforeRes.json();
		const beforeCount = beforeBody.versions.length;

		// Find a non-latest version and restore it
		const oldVersion = beforeBody.versions.find((v: any) => !v.isLatest);
		if (!oldVersion) {
			test.skip();
			return;
		}

		await authedRequest.post('/api/s3/restore', {
			data: {
				bucket: BUCKETS.versioned,
				key: VERSIONED_BUCKET.versionedFile,
				versionId: oldVersion.versionId
			}
		});

		// Version count should increase (restore creates a new version via copy)
		const afterRes = await authedRequest.get(
			`/api/s3/versions?bucket=${BUCKETS.versioned}&prefix=${VERSIONED_BUCKET.versionedFile}`
		);
		const afterBody = await afterRes.json();
		expect(afterBody.versions.length).toBeGreaterThan(beforeCount);
	});

	test('missing parameters returns 400', async ({ authedRequest }) => {
		const res1 = await authedRequest.post('/api/s3/restore', {
			data: { bucket: BUCKETS.versioned, key: 'file.txt' }
		});
		expect(res1.status()).toBe(400);

		const res2 = await authedRequest.post('/api/s3/restore', {
			data: { bucket: BUCKETS.versioned, versionId: 'v1' }
		});
		expect(res2.status()).toBe(400);

		const res3 = await authedRequest.post('/api/s3/restore', {
			data: { key: 'file.txt', versionId: 'v1' }
		});
		expect(res3.status()).toBe(400);
	});
});
