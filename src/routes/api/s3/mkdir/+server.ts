import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, createFolder } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, key } = body;

		if (!bucket || !key) {
			return json({ error: 'bucket and key are required' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);
		await createFolder(client, bucket, key);

		return json({ success: true });
	} catch (err: any) {
		console.error('Create folder error:', err);
		return json({ error: 'Failed to create folder' }, { status: 500 });
	}
};
