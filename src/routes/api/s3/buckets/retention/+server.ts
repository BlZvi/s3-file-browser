import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getBucketRetention, setBucketRetention } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');

		if (!bucket) {
			return json({ error: 'Missing required query parameter: bucket' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const retention = await getBucketRetention(client, bucket);

		return json(retention);
	} catch (err: any) {
		console.error('Get bucket retention error:', err);
		return json({ error: 'Failed to get bucket retention' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, mode, days, years } = body;

		if (!bucket) {
			return json({ error: 'bucket is required' }, { status: 400 });
		}

		if (mode !== 'GOVERNANCE' && mode !== 'COMPLIANCE') {
			return json({ error: 'mode must be "GOVERNANCE" or "COMPLIANCE"' }, { status: 400 });
		}

		if (days === undefined && years === undefined) {
			return json({ error: 'Either days or years must be specified' }, { status: 400 });
		}

		if (days !== undefined && years !== undefined) {
			return json({ error: 'Specify either days or years, not both' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		await setBucketRetention(client, bucket, mode, days, years);

		return json({ success: true });
	} catch (err: any) {
		console.error('Set bucket retention error:', err);
		return json({ error: 'Failed to set bucket retention' }, { status: 500 });
	}
};
