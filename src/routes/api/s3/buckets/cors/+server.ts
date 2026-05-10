import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getBucketCors, setBucketCors, deleteBucketCors } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');

		if (!bucket) {
			return json({ error: 'Missing required query parameter: bucket' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const rules = await getBucketCors(client, bucket);

		return json({ rules });
	} catch (err: any) {
		console.error('Get CORS error:', err);
		return json({ error: 'Failed to get CORS configuration' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, rules } = body;

		if (!bucket) {
			return json({ error: 'bucket is required' }, { status: 400 });
		}

		if (!rules || !Array.isArray(rules)) {
			return json({ error: 'rules array is required' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		await setBucketCors(client, bucket, rules);

		return json({ success: true });
	} catch (err: any) {
		console.error('Set CORS error:', err);
		return json({ error: 'Failed to set CORS configuration' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');

		if (!bucket) {
			return json({ error: 'Missing required query parameter: bucket' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		await deleteBucketCors(client, bucket);

		return json({ success: true });
	} catch (err: any) {
		console.error('Delete CORS error:', err);
		return json({ error: 'Failed to delete CORS configuration' }, { status: 500 });
	}
};
