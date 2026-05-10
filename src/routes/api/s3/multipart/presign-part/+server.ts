import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getPresignedPartUrl } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, key, uploadId, partNumber } = body;

		if (!bucket || !key || !uploadId || !partNumber) {
			return json(
				{ error: 'bucket, key, uploadId, and partNumber are required' },
				{ status: 400 }
			);
		}

		const client = createS3Client(locals.credentials!);
		const url = await getPresignedPartUrl(client, bucket, key, uploadId, partNumber);

		return json({ url });
	} catch (err: any) {
		console.error('Presign part error:', err);
		return json({ error: 'Failed to generate presigned part URL' }, { status: 500 });
	}
};
