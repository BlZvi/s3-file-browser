import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, listUploadParts } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');
		const key = url.searchParams.get('key');
		const uploadId = url.searchParams.get('uploadId');

		if (!bucket || !key || !uploadId) {
			return json(
				{ error: 'bucket, key, and uploadId parameters are required' },
				{ status: 400 }
			);
		}

		const client = createS3Client(locals.credentials!);
		const parts = await listUploadParts(client, bucket, key, uploadId);

		return json({ parts });
	} catch (err: any) {
		console.error('List parts error:', err);
		return json({ error: 'Failed to list upload parts' }, { status: 500 });
	}
};
