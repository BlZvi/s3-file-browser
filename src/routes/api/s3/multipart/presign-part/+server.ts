import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createPresignClient, object } from '$lib/server/s3';
import { s3ErrorDetail } from '$lib/server/errors';

export const POST: RequestHandler = async ({ request, locals }) => {
	let bucket: string | undefined;
	let key: string | undefined;
	let partNumber: number | undefined;
	try {
		const body = await request.json();
		bucket = body.bucket;
		key = body.key;
		partNumber = body.partNumber;
		const uploadId = body.uploadId;

		if (!bucket || !key || !uploadId || !partNumber) {
			return json(
				{ error: 'bucket, key, uploadId, and partNumber are required' },
				{ status: 400 }
			);
		}

		const client = createPresignClient(locals.credentials!);
		const url = await object.getPartUrl(client, bucket, key, uploadId, partNumber);

		return json({ url });
	} catch (err: any) {
		console.error(`Presign part error for ${bucket ?? '?'}/${key ?? '?'} part ${partNumber ?? '?'}:`, err);
		return json(
			{ error: 'Failed to generate upload URL for part', detail: s3ErrorDetail(err) },
			{ status: 500 }
		);
	}
};
