import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { S3Credentials } from '$lib/types';
import { encryptSession, decryptSession } from '$lib/server/session';
import { createS3Client, listBuckets } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	try {
		const body = await request.json();
		const { accessKeyId, secretAccessKey, region, endpoint, sessionToken } = body;

		if (!accessKeyId || !secretAccessKey) {
			return json({ error: 'Access Key ID and Secret Access Key are required' }, { status: 400 });
		}

		const credentials: S3Credentials = {
			accessKeyId,
			secretAccessKey,
			region: region || 'us-east-1',
			endpoint: endpoint || undefined,
			...(sessionToken && { sessionToken })
		};

		// Validate credentials by listing buckets
		const client = createS3Client(credentials);
		const buckets = await listBuckets(client);

		// If user has an existing OIDC session (user identity in locals),
		// merge the user identity with the new credentials
		const user = locals.user || undefined;

		// Encrypt and store in cookie
		const encrypted = encryptSession({ credentials, user });
		cookies.set('s3session', encrypted, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 8 // 8 hours
		});

		return json({ success: true, buckets });
	} catch (err: any) {
		console.error('Login error:', err);
		const message =
			err.name === 'CredentialsError' ||
			err.name === 'InvalidAccessKeyId' ||
			err.Code === 'InvalidAccessKeyId' ||
			err.name === 'SignatureDoesNotMatch' ||
			err.Code === 'SignatureDoesNotMatch'
				? 'Invalid credentials — check your access key and secret'
				: 'Failed to connect to S3';
		return json({ error: message }, { status: 401 });
	}
};
