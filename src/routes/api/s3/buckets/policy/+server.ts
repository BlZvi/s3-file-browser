import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getBucketPolicy, setBucketPolicy, deleteBucketPolicy } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');

		if (!bucket) {
			return json({ error: 'Missing required query parameter: bucket' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const policy = await getBucketPolicy(client, bucket);

		return json({ policy });
	} catch (err: any) {
		console.error('Get bucket policy error:', err);
		return json({ error: 'Failed to get bucket policy' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, policy } = body;

		if (!bucket) {
			return json({ error: 'bucket is required' }, { status: 400 });
		}

		if (!policy || typeof policy !== 'string') {
			return json({ error: 'policy must be a JSON string' }, { status: 400 });
		}

		// Validate that the policy is valid JSON
		try {
			JSON.parse(policy);
		} catch {
			return json({ error: 'policy must be a valid JSON string' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		await setBucketPolicy(client, bucket, policy);

		return json({ success: true });
	} catch (err: any) {
		console.error('Set bucket policy error:', err);
		return json({ error: 'Failed to set bucket policy' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');

		if (!bucket) {
			return json({ error: 'Missing required query parameter: bucket' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		await deleteBucketPolicy(client, bucket);

		return json({ success: true });
	} catch (err: any) {
		console.error('Delete bucket policy error:', err);
		return json({ error: 'Failed to delete bucket policy' }, { status: 500 });
	}
};
