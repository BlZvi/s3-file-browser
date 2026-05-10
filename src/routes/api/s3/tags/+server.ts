import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getObjectTags, setObjectTags } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');
		const key = url.searchParams.get('key');

		if (!bucket || !key) {
			return json({ error: 'bucket and key parameters are required' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const tags = await getObjectTags(client, bucket, key);

		return json({ tags });
	} catch (err: any) {
		console.error('Get tags error:', err);
		return json({ error: 'Failed to get object tags' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, key, tags } = body;

		if (!bucket || !key) {
			return json({ error: 'bucket and key are required' }, { status: 400 });
		}

		if (!tags || typeof tags !== 'object' || Array.isArray(tags)) {
			return json({ error: 'tags must be an object of key-value pairs' }, { status: 400 });
		}

		const tagEntries = Object.entries(tags);
		if (tagEntries.length > 10) {
			return json({ error: 'Maximum 10 tags allowed per object (S3 limit)' }, { status: 400 });
		}

		// Validate all tag keys and values are strings
		for (const [tagKey, tagValue] of tagEntries) {
			if (typeof tagKey !== 'string' || typeof tagValue !== 'string') {
				return json({ error: 'All tag keys and values must be strings' }, { status: 400 });
			}
		}

		const client = createS3Client(locals.credentials!);
		await setObjectTags(client, bucket, key, tags);

		return json({ success: true });
	} catch (err: any) {
		console.error('Set tags error:', err);
		return json({ error: 'Failed to set object tags' }, { status: 500 });
	}
};
