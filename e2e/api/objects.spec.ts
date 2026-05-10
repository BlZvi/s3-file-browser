import { test, expect } from '../fixtures/auth';
import { BUCKETS, BULK_BUCKET } from '../fixtures/constants';

test.describe('API: List Objects', () => {
	test('lists objects in test-bucket root', async ({ authedRequest }) => {
		const res = await authedRequest.get(`/api/s3/objects?bucket=${BUCKETS.test}`);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.objects).toBeInstanceOf(Array);
		expect(body.objects.length).toBeGreaterThan(0);
		expect(body.bucket).toBe(BUCKETS.test);

		// Should have both files and folders
		const files = body.objects.filter((o: any) => !o.isFolder);
		const folders = body.objects.filter((o: any) => o.isFolder);
		expect(files.length).toBeGreaterThan(0);
		expect(folders.length).toBeGreaterThan(0);
	});

	test('lists objects with prefix', async ({ authedRequest }) => {
		const res = await authedRequest.get(
			`/api/s3/objects?bucket=${BUCKETS.test}&prefix=documents/`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.prefix).toBe('documents/');
		expect(body.objects.length).toBeGreaterThan(0);

		// All returned objects should be under documents/
		for (const obj of body.objects) {
			expect(obj.key.startsWith('documents/')).toBe(true);
		}
	});

	test('lists objects in empty bucket returns empty array', async ({ authedRequest }) => {
		const res = await authedRequest.get(`/api/s3/objects?bucket=${BUCKETS.empty}`);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.objects).toBeInstanceOf(Array);
		expect(body.objects.length).toBe(0);
	});

	test('pagination with maxKeys on bulk-bucket', async ({ authedRequest }) => {
		// List level1 folders at root — there should be 10
		const res = await authedRequest.get(
			`/api/s3/objects?bucket=${BUCKETS.bulk}&maxKeys=5`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.objects.length).toBe(5);
		expect(body.isTruncated).toBe(true);
		expect(body.continuationToken).toBeTruthy();
	});

	test('follow continuationToken to get next page', async ({ authedRequest }) => {
		// First page — 5 of 10 level1 folders
		const res1 = await authedRequest.get(
			`/api/s3/objects?bucket=${BUCKETS.bulk}&maxKeys=5`
		);
		const body1 = await res1.json();
		expect(body1.continuationToken).toBeTruthy();

		// Second page
		const res2 = await authedRequest.get(
			`/api/s3/objects?bucket=${BUCKETS.bulk}&maxKeys=5&continuationToken=${encodeURIComponent(body1.continuationToken)}`
		);
		expect(res2.status()).toBe(200);

		const body2 = await res2.json();
		expect(body2.objects.length).toBe(5);
		// 10 level1 folders total, so second page should be the last
		expect(body2.isTruncated).toBe(false);
	});

	test('list objects at 5-level deep path', async ({ authedRequest }) => {
		// Navigate to the deepest level (level2/3/4 use single-digit from seq -w)
		const res = await authedRequest.get(
			`/api/s3/objects?bucket=${BUCKETS.bulk}&prefix=level1-01/level2-1/level3-1/level4-1/`
		);
		expect(res.status()).toBe(200);

		const body = await res.json();
		const files = body.objects.filter((o: any) => !o.isFolder);
		expect(files.length).toBe(BULK_BUCKET.filesPerLeaf);
	});

	test('count all objects in a level1 subtree', async ({ authedRequest }) => {
		test.setTimeout(60_000);

		// Count all files under level1-01 recursively by listing each leaf folder
		let totalFiles = 0;

		for (let l2 = 1; l2 <= BULK_BUCKET.level2Count; l2++) {
			for (let l3 = 1; l3 <= BULK_BUCKET.level3Count; l3++) {
				for (let l4 = 1; l4 <= BULK_BUCKET.level4Count; l4++) {
					// level2/3/4 use single-digit names (seq -w 1 5 → 1,2,3,4,5)
					const prefix = `level1-01/level2-${l2}/level3-${l3}/level4-${l4}/`;
					const res = await authedRequest.get(
						`/api/s3/objects?bucket=${BUCKETS.bulk}&prefix=${prefix}&maxKeys=1000`
					);
					const body = await res.json();
					totalFiles += body.objects.filter((o: any) => !o.isFolder).length;
				}
			}
		}

		// Each level1 has 5*5*4*10 = 1000 files
		expect(totalFiles).toBe(
			BULK_BUCKET.level2Count * BULK_BUCKET.level3Count * BULK_BUCKET.level4Count * BULK_BUCKET.filesPerLeaf
		);
	});

	test('missing bucket parameter returns 400', async ({ authedRequest }) => {
		const res = await authedRequest.get('/api/s3/objects');
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.error).toContain('bucket');
	});
});
