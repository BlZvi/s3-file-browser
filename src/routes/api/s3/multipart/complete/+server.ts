import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, completeMultipartUpload } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, key, uploadId, parts } = body;

		if (!bucket || !key || !uploadId || !parts || !Array.isArray(parts)) {
			return json(
				{ error: 'bucket, key, uploadId, and parts array are required' },
				{ status: 400 }
			);
		}

		const client = createS3Client(locals.credentials!);
		await completeMultipartUpload(client, bucket, key, uploadId, parts);

		return json({ success: true });
	} catch (err: any) {
		console.error('Complete multipart upload error:', err);
		return json(
			{ error: 'Failed to complete multipart upload' },
			{ status: 500 }
		);
	}
};
