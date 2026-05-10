import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, listObjects } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');
		const prefix = url.searchParams.get('prefix') || '';
		const continuationToken = url.searchParams.get('continuationToken') || undefined;
		const maxKeys = parseInt(url.searchParams.get('maxKeys') || '1000', 10);

		if (!bucket) {
			return json({ error: 'bucket parameter is required' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const result = await listObjects(client, bucket, prefix, continuationToken, maxKeys);
		return json(result);
	} catch (err: any) {
		console.error('List objects error:', err);
		return json({ error: 'Failed to list objects' }, { status: 500 });
	}
};
