import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, deleteObjects, deleteObjectVersion } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, keys, versionId } = body;

		if (!bucket || !keys || !Array.isArray(keys) || keys.length === 0) {
			return json({ error: 'bucket and keys (array) are required' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);

		// Version-specific deletion: single key + versionId
		if (versionId && typeof versionId === 'string' && keys.length === 1) {
			await deleteObjectVersion(client, bucket, keys[0], versionId);
			return json({ success: true, deleted: 1 });
		}

		// Bulk delete (existing behavior)
		await deleteObjects(client, bucket, keys);

		return json({ success: true, deleted: keys.length });
	} catch (err: any) {
		console.error('Delete error:', err);
		return json({ error: 'Failed to delete objects' }, { status: 500 });
	}
};
