import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getObjectRetention, setObjectRetention } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');
		const key = url.searchParams.get('key');

		if (!bucket || !key) {
			return json({ error: 'bucket and key parameters are required' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const retention = await getObjectRetention(client, bucket, key);

		return json(retention);
	} catch (err: any) {
		console.error('Get object retention error:', err);
		return json({ error: 'Failed to get object retention' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, key, mode, retainUntilDate, bypassGovernance } = body;

		if (!bucket || !key) {
			return json({ error: 'bucket and key are required' }, { status: 400 });
		}

		if (mode !== 'GOVERNANCE' && mode !== 'COMPLIANCE') {
			return json({ error: 'mode must be "GOVERNANCE" or "COMPLIANCE"' }, { status: 400 });
		}

		if (!retainUntilDate) {
			return json({ error: 'retainUntilDate is required' }, { status: 400 });
		}

		// Validate date
		const date = new Date(retainUntilDate);
		if (isNaN(date.getTime())) {
			return json({ error: 'retainUntilDate must be a valid date string' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		await setObjectRetention(client, bucket, key, mode, retainUntilDate, bypassGovernance);

		return json({ success: true });
	} catch (err: any) {
		console.error('Set object retention error:', err);
		return json({ error: 'Failed to set object retention' }, { status: 500 });
	}
};
