import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getPresignedDownloadUrl } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');
		const key = url.searchParams.get('key');

		if (!bucket || !key) {
			return json({ error: 'bucket and key parameters are required' }, { status: 400 });
		}

		const preview = url.searchParams.get('preview') === 'true';
		const filename = url.searchParams.get('filename') || undefined;
		const versionId = url.searchParams.get('versionId') || undefined;

		const client = createS3Client(locals.credentials!);
		const presignedUrl = await getPresignedDownloadUrl(client, bucket, key, 900, {
			preview,
			filename,
			versionId
		});

		return json({ url: presignedUrl });
	} catch (err: any) {
		console.error('Download error:', err);
		return json({ error: 'Failed to generate download URL' }, { status: 500 });
	}
};
