import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getPresignedDownloadUrl } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, key, expiresIn } = body;

		if (!bucket || !key) {
			return json({ error: 'bucket and key are required' }, { status: 400 });
		}

		const expiry = Math.min(Math.max(expiresIn || 3600, 60), 604800); // Between 1 min and 7 days
		const client = createS3Client(locals.credentials!);
		const presignedUrl = await getPresignedDownloadUrl(client, bucket, key, expiry);

		return json({ url: presignedUrl, expiresIn: expiry });
	} catch (err: any) {
		console.error('Presign error:', err);
		return json({ error: 'Failed to generate presigned URL' }, { status: 500 });
	}
};
