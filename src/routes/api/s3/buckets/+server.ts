import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, listBuckets, createBucket, deleteBucket } from '$lib/server/s3';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const client = createS3Client(locals.credentials!);
		const buckets = await listBuckets(client);
		return json({ buckets });
	} catch (err: any) {
		console.error('List buckets error:', err);
		return json({ error: 'Failed to list buckets' }, { status: 500 });
	}
};

const BUCKET_NAME_REGEX = /^[a-z0-9][a-z0-9.\-]{1,61}[a-z0-9]$/;

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { name, versioning, objectLocking } = body;

		if (!name || typeof name !== 'string') {
			return json({ error: 'Bucket name is required' }, { status: 400 });
		}

		// Validate bucket name: 3-63 chars, lowercase, DNS-compatible
		if (name.length < 3 || name.length > 63) {
			return json(
				{ error: 'Bucket name must be between 3 and 63 characters' },
				{ status: 400 }
			);
		}

		if (!BUCKET_NAME_REGEX.test(name)) {
			return json(
				{
					error:
						'Bucket name must be lowercase, start and end with a letter or number, and contain only letters, numbers, hyphens, and periods'
				},
				{ status: 400 }
			);
		}

		// No consecutive periods or adjacent period-hyphen
		if (name.includes('..') || name.includes('-.') || name.includes('.-')) {
			return json(
				{ error: 'Bucket name must not contain consecutive periods or adjacent period and hyphen' },
				{ status: 400 }
			);
		}

		const client = createS3Client(locals.credentials!);
		await createBucket(client, name, { versioning, objectLocking });

		return json({ success: true, name });
	} catch (err: any) {
		console.error('Create bucket error:', err);
		return json({ error: 'Failed to create bucket' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { name } = body;

		if (!name || typeof name !== 'string') {
			return json({ error: 'Bucket name is required' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		await deleteBucket(client, name);

		return json({ success: true });
	} catch (err: any) {
		console.error('Delete bucket error:', err);
		return json({ error: 'Failed to delete bucket' }, { status: 500 });
	}
};
