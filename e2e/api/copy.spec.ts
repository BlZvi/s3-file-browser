import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: Copy/Move/Rename', () => {
	test('copy single object', async ({ authedRequest }) => {
		const ts = Date.now();
		const srcKey = `e2e-copy-src-${ts}.txt`;
		const destKey = `e2e-copy-dest-${ts}.txt`;

		// Create test file
		const presignRes = await authedRequest.post('/api/s3/upload', {
			data: { bucket: BUCKETS.test, key: srcKey, contentType: 'text/plain' }
		});
		const { url } = await presignRes.json();
		await authedRequest.put(url, {
			data: 'copy me',
			headers: { 'Content-Type': 'text/plain' }
		});

		// Copy it
		const copyRes = await authedRequest.post('/api/s3/copy', {
			data: {
				sourceBucket: BUCKETS.test,
				sourceKey: srcKey,
				destBucket: BUCKETS.test,
				destKey: destKey,
				mode: 'copy',
				isFolder: false
			}
		});
		expect(copyRes.status()).toBe(200);
		const body = await copyRes.json();
		expect(body.success).toBe(true);

		// Verify both exist
		const headSrc = await authedRequest.get(
			`/api/s3/head?bucket=${BUCKETS.test}&key=${encodeURIComponent(srcKey)}`
		);
		expect(headSrc.status()).toBe(200);

		const headDest = await authedRequest.get(
			`/api/s3/head?bucket=${BUCKETS.test}&key=${encodeURIComponent(destKey)}`
		);
		expect(headDest.status()).toBe(200);

		// Cleanup
		await authedRequest.post('/api/s3/delete', {
			data: { bucket: BUCKETS.test, keys: [srcKey, destKey] }
		});
	});

	test('move single object', async ({ authedRequest }) => {
		const ts = Date.now();
		const srcKey = `e2e-move-src-${ts}.txt`;
		const destKey = `e2e-move-dest-${ts}.txt`;

		// Create test file
		const presignRes = await authedRequest.post('/api/s3/upload', {
			data: { bucket: BUCKETS.test, key: srcKey, contentType: 'text/plain' }
		});
		const { url } = await presignRes.json();
		await authedRequest.put(url, {
			data: 'move me',
			headers: { 'Content-Type': 'text/plain' }
		});

		// Move it
		const moveRes = await authedRequest.post('/api/s3/copy', {
			data: {
				sourceBucket: BUCKETS.test,
				sourceKey: srcKey,
				destBucket: BUCKETS.test,
				destKey: destKey,
				mode: 'move',
				isFolder: false
			}
		});
		expect(moveRes.status()).toBe(200);
		const body = await moveRes.json();
		expect(body.success).toBe(true);

		// Verify source is gone
		const headSrc = await authedRequest.get(
			`/api/s3/head?bucket=${BUCKETS.test}&key=${encodeURIComponent(srcKey)}`
		);
		expect(headSrc.status()).toBe(404); // Object not found

		// Verify dest exists
		const headDest = await authedRequest.get(
			`/api/s3/head?bucket=${BUCKETS.test}&key=${encodeURIComponent(destKey)}`
		);
		expect(headDest.status()).toBe(200);

		// Cleanup
		await authedRequest.post('/api/s3/delete', {
			data: { bucket: BUCKETS.test, keys: [destKey] }
		});
	});

	test('rename object', async ({ authedRequest }) => {
		const ts = Date.now();
		const srcKey = `e2e-rename-old-${ts}.txt`;
		const destKey = `e2e-rename-new-${ts}.txt`;

		// Create test file
		const presignRes = await authedRequest.post('/api/s3/upload', {
			data: { bucket: BUCKETS.test, key: srcKey, contentType: 'text/plain' }
		});
		const { url } = await presignRes.json();
		await authedRequest.put(url, {
			data: 'rename me',
			headers: { 'Content-Type': 'text/plain' }
		});

		// Rename it (rename = move with same bucket)
		const renameRes = await authedRequest.post('/api/s3/copy', {
			data: {
				sourceBucket: BUCKETS.test,
				sourceKey: srcKey,
				destBucket: BUCKETS.test,
				destKey: destKey,
				mode: 'rename',
				isFolder: false
			}
		});
		expect(renameRes.status()).toBe(200);
		const body = await renameRes.json();
		expect(body.success).toBe(true);

		// Verify old is gone
		const headOld = await authedRequest.get(
			`/api/s3/head?bucket=${BUCKETS.test}&key=${encodeURIComponent(srcKey)}`
		);
		expect(headOld.status()).toBe(404);

		// Verify new exists
		const headNew = await authedRequest.get(
			`/api/s3/head?bucket=${BUCKETS.test}&key=${encodeURIComponent(destKey)}`
		);
		expect(headNew.status()).toBe(200);

		// Cleanup
		await authedRequest.post('/api/s3/delete', {
			data: { bucket: BUCKETS.test, keys: [destKey] }
		});
	});

	test('copy folder recursively', async ({ authedRequest }) => {
		const ts = Date.now();
		const srcPrefix = `e2e-copyfolder-src-${ts}/`;
		const destPrefix = `e2e-copyfolder-dest-${ts}/`;

		// Create folder with files
		const files = ['file1.txt', 'sub/file2.txt'];
		for (const file of files) {
			const key = srcPrefix + file;
			const presignRes = await authedRequest.post('/api/s3/upload', {
				data: { bucket: BUCKETS.test, key, contentType: 'text/plain' }
			});
			const { url } = await presignRes.json();
			await authedRequest.put(url, {
				data: `content of ${file}`,
				headers: { 'Content-Type': 'text/plain' }
			});
		}

		// Copy folder
		const copyRes = await authedRequest.post('/api/s3/copy', {
			data: {
				sourceBucket: BUCKETS.test,
				sourceKey: srcPrefix,
				destBucket: BUCKETS.test,
				destKey: destPrefix,
				mode: 'copy',
				isFolder: true
			}
		});
		expect(copyRes.status()).toBe(200);
		const body = await copyRes.json();
		expect(body.success).toBe(true);
		expect(body.copied).toBe(2);

		// Verify all copied files exist
		for (const file of files) {
			const headRes = await authedRequest.get(
				`/api/s3/head?bucket=${BUCKETS.test}&key=${encodeURIComponent(destPrefix + file)}`
			);
			expect(headRes.status()).toBe(200);
		}

		// Cleanup
		const allKeys = [
			...files.map((f) => srcPrefix + f),
			...files.map((f) => destPrefix + f)
		];
		await authedRequest.post('/api/s3/delete', {
			data: { bucket: BUCKETS.test, keys: allKeys }
		});
	});

	test('returns 400 for missing params', async ({ authedRequest }) => {
		// Missing sourceKey
		const res1 = await authedRequest.post('/api/s3/copy', {
			data: {
				sourceBucket: BUCKETS.test,
				destBucket: BUCKETS.test,
				destKey: 'dest.txt',
				mode: 'copy'
			}
		});
		expect(res1.status()).toBe(400);

		// Missing mode
		const res2 = await authedRequest.post('/api/s3/copy', {
			data: {
				sourceBucket: BUCKETS.test,
				sourceKey: 'src.txt',
				destBucket: BUCKETS.test,
				destKey: 'dest.txt'
			}
		});
		expect(res2.status()).toBe(400);

		// Invalid mode
		const res3 = await authedRequest.post('/api/s3/copy', {
			data: {
				sourceBucket: BUCKETS.test,
				sourceKey: 'src.txt',
				destBucket: BUCKETS.test,
				destKey: 'dest.txt',
				mode: 'invalid'
			}
		});
		expect(res3.status()).toBe(400);
	});
});
