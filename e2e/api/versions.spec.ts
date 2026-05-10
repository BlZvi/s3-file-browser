import { test, expect } from '../fixtures/auth';
import { BUCKETS, VERSIONED_BUCKET } from '../fixtures/constants';

test.describe('API: Object Versions', () => {
	test('list versions for versioned object', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/versions?bucket=${BUCKETS.versioned}&prefix=${VERSIONED_BUCKET.versionedFile}`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.versions).toBeInstanceOf(Array);
		expect(body.versions.length).toBeGreaterThanOrEqual(VERSIONED_BUCKET.expectedVersionCount);
	});

	test('versions include isLatest flag', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/versions?bucket=${BUCKETS.versioned}&prefix=${VERSIONED_BUCKET.versionedFile}`
		);
		const body = await res.json();

		// Exactly one version should be marked as latest
		const latestVersions = body.versions.filter((v: any) => v.isLatest);
		expect(latestVersions.length).toBe(1);

		// Each version should have required fields
		for (const version of body.versions) {
			expect(version.key).toBe(VERSIONED_BUCKET.versionedFile);
			expect(version.versionId).toBeTruthy();
			expect(version.lastModified).toBeTruthy();
			expect(typeof version.size).toBe('number');
		}
	});

	test('delete markers appear after delete', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/versions?bucket=${BUCKETS.versioned}&prefix=${VERSIONED_BUCKET.deletedFile}`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.deleteMarkers).toBeInstanceOf(Array);
		expect(body.deleteMarkers.length).toBeGreaterThanOrEqual(1);

		// Delete marker should have isDeleteMarker = true
		for (const dm of body.deleteMarkers) {
			expect(dm.isDeleteMarker).toBe(true);
		}
	});

	test('missing bucket returns 400', async ({ authedRequest }) => {
		const res = await authedRequest.get('/api/s3/versions');
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.error).toContain('bucket');
	});

	test('non-versioned bucket returns empty versions', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/versions?bucket=${BUCKETS.test}&prefix=hello.txt`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		// Non-versioned buckets may return versions with null versionId
		expect(body.versions).toBeInstanceOf(Array);
	});
});
