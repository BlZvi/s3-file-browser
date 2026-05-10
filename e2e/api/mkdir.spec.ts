import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Create Folder', () => {
	test('create folder', async ({ authedRequest }) => {
		const folderName = `e2e-folder-${Date.now()}`;

		const res = await authedRequest.post('/api/s3/mkdir', {
			data: { bucket: BUCKETS.test, key: folderName }
		});
		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);

		// Verify folder appears in listing
		const listRes = await authedRequest.get(`/api/s3/objects?bucket=${BUCKETS.test}`);
		const listBody = await listRes.json();
		const folderKeys = listBody.objects
			.filter((o: any) => o.isFolder)
			.map((o: any) => o.key);
		expect(folderKeys).toContain(`${folderName}/`);

		// Cleanup
		await authedRequest.post('/api/s3/delete', {
			data: { bucket: BUCKETS.test, keys: [`${folderName}/`] }
		});
	});

	test('create nested folder', async ({ authedRequest }) => {
		const parentFolder = `e2e-parent-${Date.now()}`;
		const nestedFolder = `${parentFolder}/nested`;

		const res = await authedRequest.post('/api/s3/mkdir', {
			data: { bucket: BUCKETS.test, key: nestedFolder }
		});
		expect(res.status()).toBe(200);

		// Verify nested folder appears when listing parent
		const listRes = await authedRequest.get(
			`/api/s3/objects?bucket=${BUCKETS.test}&prefix=${parentFolder}/`
		);
		const listBody = await listRes.json();
		const folderKeys = listBody.objects
			.filter((o: any) => o.isFolder)
			.map((o: any) => o.key);
		expect(folderKeys).toContain(`${nestedFolder}/`);

		// Cleanup
		await authedRequest.post('/api/s3/delete', {
			data: { bucket: BUCKETS.test, keys: [`${nestedFolder}/`] }
		});
	});

	test('missing parameters returns 400', async ({ authedRequest }) => {
		const res1 = await authedRequest.post('/api/s3/mkdir', {
			data: { bucket: BUCKETS.test }
		});
		expect(res1.status()).toBe(400);

		const res2 = await authedRequest.post('/api/s3/mkdir', {
			data: { key: 'test-folder' }
		});
		expect(res2.status()).toBe(400);
	});
});
