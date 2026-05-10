import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getPresignedUploadUrl } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, key, contentType } = body;

		if (!bucket || !key) {
			return json({ error: 'bucket and key are required' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const presignedUrl = await getPresignedUploadUrl(
			client,
			bucket,
			key,
			contentType || 'application/octet-stream'
		);

		return json({ url: presignedUrl });
	} catch (err: any) {
		console.error('Upload presign error:', err);
		return json({ error: 'Failed to generate upload URL' }, { status: 500 });
	}
};
