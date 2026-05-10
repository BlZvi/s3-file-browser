import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, restoreObjectVersion } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, key, versionId } = body;

		if (!bucket || !key || !versionId) {
			return json(
				{ error: 'bucket, key, and versionId are required' },
				{ status: 400 }
			);
		}

		const client = createS3Client(locals.credentials!);
		await restoreObjectVersion(client, bucket, key, versionId);

		return json({ success: true });
	} catch (err: any) {
		console.error('Restore version error:', err);
		return json({ error: 'Failed to restore object version' }, { status: 500 });
	}
};
