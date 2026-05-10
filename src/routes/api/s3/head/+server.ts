import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, headObject, getObjectTags } from '$lib/server/s3';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const bucket = url.searchParams.get('bucket');
		const key = url.searchParams.get('key');

		if (!bucket || !key) {
			return json({ error: 'bucket and key parameters are required' }, { status: 400 });
		}

		const includeTags = url.searchParams.get('includeTags') === 'true';
		const includeVersionId = url.searchParams.get('includeVersionId') === 'true';

		const client = createS3Client(locals.credentials!);
		const metadata = await headObject(client, bucket, key);

		const result: Record<string, unknown> = { ...metadata };

		// versionId is already in metadata from HeadObject, but only expose if requested
		if (!includeVersionId) {
			delete result.versionId;
		}

		if (includeTags) {
			result.tags = await getObjectTags(client, bucket, key);
		}

		return json(result);
	} catch (err: any) {
		console.error('Head object error:', err);
		const errorName = err.name || err.Code || '';
		const isNotFound = errorName === 'NotFound' || errorName === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404;
		return json(
			{ error: isNotFound ? 'Object not found' : 'Failed to get object metadata', code: errorName },
			{ status: isNotFound ? 404 : 500 }
		);
	}
};
