import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, initiateMultipartUpload } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, key, contentType } = body;

		if (!bucket || !key) {
			return json({ error: 'bucket and key are required' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const result = await initiateMultipartUpload(client, bucket, key, contentType);

		return json(result);
	} catch (err: any) {
		console.error('Initiate multipart upload error:', err);
		return json({ error: 'Failed to initiate multipart upload' }, { status: 500 });
	}
};
