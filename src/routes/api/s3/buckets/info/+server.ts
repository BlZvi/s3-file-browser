import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getBucketInfo } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');

		if (!bucket) {
			return json({ error: 'Missing required query parameter: bucket' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const info = await getBucketInfo(client, bucket);

		return json(info);
	} catch (err: any) {
		console.error('Get bucket info error:', err);
		return json({ error: 'Failed to get bucket info' }, { status: 500 });
	}
};
