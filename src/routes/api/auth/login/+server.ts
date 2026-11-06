import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { S3Credentials, BucketInfo } from '$lib/types';
import { encryptSession } from '$lib/server/session';
import { createS3Client, bucket as bucketApi } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	try {
		const body = await request.json();
		const { accessKeyId, secretAccessKey, region, endpoint, publicEndpoint, sessionToken } = body;

		if (!accessKeyId || !secretAccessKey) {
			return json({ error: 'Access Key ID and Secret Access Key are required' }, { status: 400 });
		}

		const credentials: S3Credentials = {
			accessKeyId,
			secretAccessKey,
			region: region || 'us-east-1',
			endpoint: endpoint || undefined,
			publicEndpoint: publicEndpoint || undefined,
			...(sessionToken && { sessionToken })
		};

		// Validate credentials. In single-bucket mode we HeadBucket on the
		// configured bucket (no s3:ListAllMyBuckets permission required);
		// otherwise we ListBuckets as before.
		const client = createS3Client(credentials);
		let buckets: BucketInfo[];
		if (locals.singleBucket) {
			await bucketApi.head(client, locals.singleBucket);
			buckets = [{ name: locals.singleBucket }];
		} else {
			buckets = await bucketApi.list(client);
		}

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
		const code = err.name || err.Code || '';
		let message: string;
		if (
			code === 'CredentialsError' ||
			code === 'InvalidAccessKeyId' ||
			code === 'SignatureDoesNotMatch'
		) {
			message = 'Invalid credentials — check your access key and secret';
		} else if (code === 'NoSuchBucket' || code === 'NotFound') {
			message = locals.singleBucket
				? `Bucket "${locals.singleBucket}" does not exist or is not accessible with these credentials`
				: 'Bucket not found';
		} else if (code === 'AccessDenied' || code === 'Forbidden') {
			message = locals.singleBucket
				? `Access denied to bucket "${locals.singleBucket}" — verify the IAM policy allows s3:ListBucket on this bucket`
				: 'Access denied — these credentials lack s3:ListAllMyBuckets permission. Set the S3_BUCKET env var to enable single-bucket mode.';
		} else {
			message = 'Failed to connect to S3';
		}
		return json({ error: message }, { status: 401 });
	}
};
