import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, abortMultipartUpload } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, key, uploadId } = body;

		if (!bucket || !key || !uploadId) {
			return json({ error: 'bucket, key, and uploadId are required' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		await abortMultipartUpload(client, bucket, key, uploadId);

		return json({ success: true });
	} catch (err: any) {
		console.error('Abort multipart upload error:', err);
		return json({ error: 'Failed to abort multipart upload' }, { status: 500 });
	}
};
