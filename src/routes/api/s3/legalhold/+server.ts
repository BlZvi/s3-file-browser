import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getObjectLegalHold, setObjectLegalHold } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');
		const key = url.searchParams.get('key');

		if (!bucket || !key) {
			return json({ error: 'bucket and key parameters are required' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		const status = await getObjectLegalHold(client, bucket, key);

		return json({ status });
	} catch (err: any) {
		console.error('Get legal hold error:', err);
		return json({ error: 'Failed to get legal hold status' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, key, status } = body;

		if (!bucket || !key) {
			return json({ error: 'bucket and key are required' }, { status: 400 });
		}

		if (status !== 'ON' && status !== 'OFF') {
			return json({ error: 'status must be "ON" or "OFF"' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		await setObjectLegalHold(client, bucket, key, status);

		return json({ success: true });
	} catch (err: any) {
		console.error('Set legal hold error:', err);
		return json({ error: 'Failed to set legal hold' }, { status: 500 });
	}
};
