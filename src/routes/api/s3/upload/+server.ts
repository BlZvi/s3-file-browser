import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createPresignClient, object } from '$lib/server/s3';
import { s3ErrorDetail } from '$lib/server/errors';

export const POST: RequestHandler = async ({ request, locals }) => {
	let bucket: string | undefined;
	let key: string | undefined;
	try {
		const body = await request.json();
		bucket = body.bucket;
		key = body.key;
		const contentType = body.contentType;

		if (!bucket || !key) {
			return json({ error: 'bucket and key are required' }, { status: 400 });
		}

		const client = createPresignClient(locals.credentials!);
		const presignedUrl = await object.getUploadUrl(
			client,
			bucket,
			key,
			contentType || 'application/octet-stream'
		);

		return json({ url: presignedUrl });
	} catch (err: any) {
		console.error(`Upload presign error for ${bucket ?? '?'}/${key ?? '?'}:`, err);
		return json(
			{ error: 'Failed to generate upload URL', detail: s3ErrorDetail(err) },
			{ status: 500 }
		);
	}
};
