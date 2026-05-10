import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, listObjectVersions } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');
		const prefix = url.searchParams.get('prefix') || '';
		const keyMarker = url.searchParams.get('keyMarker') || undefined;
		const maxKeys = parseInt(url.searchParams.get('maxKeys') || '100', 10);

		if (!bucket) {
			return json({ error: 'bucket parameter is required' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const result = await listObjectVersions(client, bucket, prefix, keyMarker, maxKeys);
		return json(result);
	} catch (err: any) {
		console.error('List object versions error:', err);
		return json({ error: 'Failed to list object versions' }, { status: 500 });
	}
};
