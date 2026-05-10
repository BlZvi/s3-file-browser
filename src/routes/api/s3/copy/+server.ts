import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, copyObject, copyFolder, moveObject, moveFolder } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { sourceBucket, sourceKey, destBucket, destKey, mode, isFolder } = await request.json();

		// Validate required fields
		if (!sourceBucket || !sourceKey || !destBucket || !destKey) {
			return json(
				{ error: 'sourceBucket, sourceKey, destBucket, and destKey are required' },
				{ status: 400 }
			);
		}

		if (!mode || !['copy', 'move', 'rename'].includes(mode)) {
			return json({ error: 'mode must be one of: copy, move, rename' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);

		if (mode === 'copy') {
			if (isFolder) {
				const result = await copyFolder(client, sourceBucket, sourceKey, destBucket, destKey);
				return json({ success: true, copied: result.copied });
			} else {
				await copyObject(client, sourceBucket, sourceKey, destBucket, destKey);
				return json({ success: true });
			}
		} else {
			// mode === 'move' or mode === 'rename' (rename is just move within same bucket)
			if (isFolder) {
				const result = await moveFolder(client, sourceBucket, sourceKey, destBucket, destKey);
				return json({ success: true, moved: result.moved });
			} else {
				await moveObject(client, sourceBucket, sourceKey, destBucket, destKey);
				return json({ success: true });
			}
		}
	} catch (err: any) {
		console.error('Copy/Move error:', err);
		return json({ error: 'Failed to copy/move object' }, { status: 500 });
	}
};
