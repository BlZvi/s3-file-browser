import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, getObjectStream } from '$lib/server/s3';
import archiver from 'archiver';
import { Readable, PassThrough } from 'stream';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, keys } = body;

		if (!bucket || !keys || !Array.isArray(keys) || keys.length === 0) {
			return json({ error: 'bucket and keys (non-empty array) are required' }, { status: 400 });
		}

		if (keys.length > 100) {
			return json({ error: 'Maximum 100 keys allowed per download' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);

		const archive = archiver('zip', { zlib: { level: 5 } });
		const passthrough = new PassThrough();
		archive.pipe(passthrough);

		// Handle archive errors
		archive.on('error', (err) => {
			console.error('Archive error:', err);
			passthrough.destroy(err);
		});

		// Add each file to the archive
		for (const key of keys) {
			try {
				const stream = await getObjectStream(client, bucket, key);
				archive.append(stream as Readable, { name: key });
			} catch (err: any) {
				console.error(`Failed to fetch object "${key}":`, err.message);
				// Continue with remaining files
			}
		}

		// Finalize the archive (no more files will be added)
		archive.finalize();

		// Convert Node stream to web ReadableStream for the Response
		const webStream = Readable.toWeb(passthrough) as ReadableStream;

		return new Response(webStream, {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': 'attachment; filename="download.zip"'
			}
		});
	} catch (err: any) {
		console.error('Download multiple error:', err);
		return json({ error: 'Failed to create ZIP archive' }, { status: 500 });
	}
};
