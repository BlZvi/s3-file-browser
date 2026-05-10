import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getBucketTags, setBucketTags, deleteBucketTags } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');

		if (!bucket) {
			return json({ error: 'Missing required query parameter: bucket' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const tags = await getBucketTags(client, bucket);

		return json({ tags });
	} catch (err: any) {
		console.error('Get bucket tags error:', err);
		return json({ error: 'Failed to get bucket tags' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, tags } = body;

		if (!bucket) {
			return json({ error: 'bucket is required' }, { status: 400 });
		}

		if (!tags || typeof tags !== 'object' || Array.isArray(tags)) {
			return json({ error: 'tags must be an object of key-value pairs' }, { status: 400 });
		}

		const tagEntries = Object.entries(tags);
		if (tagEntries.length > 50) {
			return json({ error: 'Maximum 50 tags allowed per bucket (S3 limit)' }, { status: 400 });
		}

		// Validate all tag keys and values are strings
		for (const [tagKey, tagValue] of tagEntries) {
			if (typeof tagKey !== 'string' || typeof tagValue !== 'string') {
				return json({ error: 'All tag keys and values must be strings' }, { status: 400 });
			}
		}

		const client = createS3Client(locals.credentials!);
		await setBucketTags(client, bucket, tags);

		return json({ success: true });
	} catch (err: any) {
		console.error('Set bucket tags error:', err);
		return json({ error: 'Failed to set bucket tags' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');

		if (!bucket) {
			return json({ error: 'Missing required query parameter: bucket' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		await deleteBucketTags(client, bucket);

		return json({ success: true });
	} catch (err: any) {
		console.error('Delete bucket tags error:', err);
		return json({ error: 'Failed to delete bucket tags' }, { status: 500 });
	}
};
