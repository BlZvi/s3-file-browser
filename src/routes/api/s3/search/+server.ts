import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, searchObjects } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');
		const prefix = url.searchParams.get('prefix') ?? '';
		const query = url.searchParams.get('q') ?? '';
		const maxKeys = parseInt(url.searchParams.get('maxKeys') ?? '200');

		if (!bucket) {
			return json({ error: 'bucket is required' }, { status: 400 });
		}
		if (!query || query.length < 2) {
			return json({ error: 'search query (q) must be at least 2 characters' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const result = await searchObjects(client, bucket, prefix, query, maxKeys);
		return json(result);
	} catch (err: any) {
		console.error('Search error:', err);
		return json({ error: 'Search failed' }, { status: 500 });
	}
};
