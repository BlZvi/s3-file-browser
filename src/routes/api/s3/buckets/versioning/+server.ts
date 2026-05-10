import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getBucketVersioning, setBucketVersioning } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');

		if (!bucket) {
			return json({ error: 'Missing required query parameter: bucket' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const status = await getBucketVersioning(client, bucket);

		return json({ status });
	} catch (err: any) {
		console.error('Get bucket versioning error:', err);
		return json({ error: 'Failed to get bucket versioning' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, enabled } = body;

		if (!bucket) {
			return json({ error: 'bucket is required' }, { status: 400 });
		}

		if (typeof enabled !== 'boolean') {
			return json({ error: 'enabled must be a boolean' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		await setBucketVersioning(client, bucket, enabled);

		return json({ success: true });
	} catch (err: any) {
		console.error('Set bucket versioning error:', err);
		return json({ error: 'Failed to set bucket versioning' }, { status: 500 });
	}
};
