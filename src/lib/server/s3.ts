import {
	S3Client,
	ListBucketsCommand,
	ListObjectsV2Command,
	DeleteObjectCommand,
	PutObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	CreateBucketCommand,
	DeleteBucketCommand,
	PutBucketVersioningCommand,
	GetBucketVersioningCommand,
	GetBucketTaggingCommand,
	PutBucketTaggingCommand,
	DeleteBucketTaggingCommand,
	GetBucketPolicyCommand,
	PutBucketPolicyCommand,
	DeleteBucketPolicyCommand,
	GetObjectLockConfigurationCommand,
	PutObjectLockConfigurationCommand,
	GetObjectTaggingCommand,
	PutObjectTaggingCommand,
	GetObjectLegalHoldCommand,
	PutObjectLegalHoldCommand,
	GetObjectRetentionCommand,
	PutObjectRetentionCommand,
	ListObjectVersionsCommand,
	CopyObjectCommand,
	CreateMultipartUploadCommand,
	UploadPartCommand,
	CompleteMultipartUploadCommand,
	AbortMultipartUploadCommand,
	ListPartsCommand,
	GetBucketCorsCommand,
	PutBucketCorsCommand,
	DeleteBucketCorsCommand,
	type CreateBucketCommandInput
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
	S3Credentials,
	S3Object,
	BucketInfo,
	BrowseResult,
	ObjectMetadata,
	BucketDetails,
	ObjectVersion,
	CorsRule
} from '$lib/types';

export function createS3Client(credentials: S3Credentials): S3Client {
	const config: Record<string, unknown> = {
		region: credentials.region || 'us-east-1',
		credentials: {
			accessKeyId: credentials.accessKeyId,
			secretAccessKey: credentials.secretAccessKey,
			...(credentials.sessionToken && { sessionToken: credentials.sessionToken })
		}
	};

	if (credentials.endpoint) {
		config.endpoint = credentials.endpoint;
		config.forcePathStyle = true; // Required for MinIO and most S3-compatible services
	}

	return new S3Client(config);
}

export async function listBuckets(client: S3Client): Promise<BucketInfo[]> {
	const response = await client.send(new ListBucketsCommand({}));
	return (response.Buckets || []).map((b) => ({
		name: b.Name || '',
		creationDate: b.CreationDate?.toISOString()
	}));
}

export async function listObjects(
	client: S3Client,
	bucket: string,
	prefix: string = '',
	continuationToken?: string,
	maxKeys: number = 1000
): Promise<BrowseResult> {
	const command = new ListObjectsV2Command({
		Bucket: bucket,
		Prefix: prefix,
		Delimiter: '/',
		MaxKeys: maxKeys,
		ContinuationToken: continuationToken
	});

	const response = await client.send(command);

	// Process folders (common prefixes)
	const folders = (response.CommonPrefixes || []).map((cp) => cp.Prefix || '');

	// Process files (exclude the prefix itself if it appears as an object)
	const objects: S3Object[] = (response.Contents || [])
		.filter((obj) => obj.Key !== prefix) // Exclude the "folder" marker itself
		.map((obj) => {
			const key = obj.Key || '';
			const name = key.slice(prefix.length); // Remove prefix to get relative name
			return {
				key,
				name,
				size: obj.Size || 0,
				lastModified: obj.LastModified?.toISOString() || '',
				isFolder: false,
				etag: obj.ETag?.replace(/"/g, '')
			};
		});

	// Add folder entries
	const folderObjects: S3Object[] = folders.map((f) => {
		const name = f.slice(prefix.length).replace(/\/$/, ''); // Remove prefix and trailing slash
		return {
			key: f,
			name,
			size: 0,
			lastModified: '',
			isFolder: true
		};
	});

	return {
		objects: [...folderObjects, ...objects],
		folders,
		prefix,
		bucket,
		continuationToken: response.NextContinuationToken,
		isTruncated: response.IsTruncated || false
	};
}

export async function deleteObject(client: S3Client, bucket: string, key: string): Promise<void> {
	await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteObjects(
	client: S3Client,
	bucket: string,
	keys: string[]
): Promise<void> {
	// Delete one by one (simpler, works with all S3-compatible services)
	for (const key of keys) {
		await deleteObject(client, bucket, key);
	}
}

export async function createFolder(
	client: S3Client,
	bucket: string,
	key: string
): Promise<void> {
	// Ensure key ends with /
	const folderKey = key.endsWith('/') ? key : `${key}/`;
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: folderKey,
			Body: ''
		})
	);
}

export async function getPresignedDownloadUrl(
	client: S3Client,
	bucket: string,
	key: string,
	expiresIn: number = 900,
	options?: { preview?: boolean; filename?: string; versionId?: string }
): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
		...(options?.versionId && { VersionId: options.versionId }),
		...(options?.preview
			? { ResponseContentDisposition: 'inline' }
			: options?.filename
				? { ResponseContentDisposition: `attachment; filename="${options.filename}"` }
				: {})
	});
	return getSignedUrl(client, command, { expiresIn });
}

export async function headObject(
	client: S3Client,
	bucket: string,
	key: string
): Promise<ObjectMetadata> {
	const response = await client.send(
		new HeadObjectCommand({ Bucket: bucket, Key: key })
	);

	return {
		key,
		bucket,
		size: response.ContentLength || 0,
		lastModified: response.LastModified?.toISOString() || '',
		contentType: response.ContentType || 'application/octet-stream',
		etag: (response.ETag || '').replace(/"/g, ''),
		storageClass: response.StorageClass,
		versionId: response.VersionId,
		metadata: response.Metadata || {}
	};
}

export async function getPresignedUploadUrl(
	client: S3Client,
	bucket: string,
	key: string,
	contentType: string = 'application/octet-stream',
	expiresIn: number = 900
): Promise<string> {
	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		ContentType: contentType
	});
	return getSignedUrl(client, command, { expiresIn });
}

export async function createBucket(
	client: S3Client,
	name: string,
	options?: { versioning?: boolean; objectLocking?: boolean }
): Promise<void> {
	const createParams: CreateBucketCommandInput = { Bucket: name };

	if (options?.objectLocking) {
		createParams.ObjectLockEnabledForBucket = true;
	}

	await client.send(new CreateBucketCommand(createParams));

	// Enable versioning if requested (object locking already implies versioning)
	if (options?.versioning && !options?.objectLocking) {
		await client.send(
			new PutBucketVersioningCommand({
				Bucket: name,
				VersioningConfiguration: { Status: 'Enabled' }
			})
		);
	}
}

export async function deleteBucket(client: S3Client, name: string): Promise<void> {
	await client.send(new DeleteBucketCommand({ Bucket: name }));
}

export async function getBucketInfo(client: S3Client, name: string): Promise<BucketDetails> {
	// Get versioning status
	const versioningResponse = await client.send(
		new GetBucketVersioningCommand({ Bucket: name })
	);
	const versioning: BucketDetails['versioning'] = versioningResponse.Status === 'Enabled'
		? 'Enabled'
		: versioningResponse.Status === 'Suspended'
			? 'Suspended'
			: 'Disabled';

	// Get tags (may not exist)
	let tags: Record<string, string> = {};
	try {
		const taggingResponse = await client.send(
			new GetBucketTaggingCommand({ Bucket: name })
		);
		for (const tag of taggingResponse.TagSet || []) {
			if (tag.Key && tag.Value !== undefined) {
				tags[tag.Key] = tag.Value;
			}
		}
	} catch (err: any) {
		// NoSuchTagSet is expected when no tags are set
		if (err.name !== 'NoSuchTagSet' && err.Code !== 'NoSuchTagSet') {
			throw err;
		}
	}

	// Get object lock configuration (may not exist)
	let objectLocking = false;
	try {
		const lockResponse = await client.send(
			new GetObjectLockConfigurationCommand({ Bucket: name })
		);
		objectLocking = lockResponse.ObjectLockConfiguration?.ObjectLockEnabled === 'Enabled';
	} catch (err: any) {
		// ObjectLockConfigurationNotFoundError is expected when not configured
		if (
			err.name !== 'ObjectLockConfigurationNotFoundError' &&
			err.Code !== 'ObjectLockConfigurationNotFoundError'
		) {
			throw err;
		}
	}

	return {
		name,
		versioning,
		objectLocking,
		tags
	};
}

export async function listObjectVersions(
	client: S3Client,
	bucket: string,
	prefix: string,
	keyMarker?: string,
	maxKeys?: number
): Promise<{
	versions: ObjectVersion[];
	deleteMarkers: ObjectVersion[];
	isTruncated: boolean;
	nextKeyMarker?: string;
	nextVersionIdMarker?: string;
}> {
	const command = new ListObjectVersionsCommand({
		Bucket: bucket,
		Prefix: prefix,
		KeyMarker: keyMarker,
		MaxKeys: maxKeys
	});

	const response = await client.send(command);

	const versions: ObjectVersion[] = (response.Versions || []).map((v) => ({
		key: v.Key || '',
		versionId: v.VersionId || '',
		isLatest: v.IsLatest || false,
		lastModified: v.LastModified?.toISOString() || '',
		size: v.Size || 0,
		etag: v.ETag?.replace(/"/g, ''),
		isDeleteMarker: false,
		storageClass: v.StorageClass
	}));

	const deleteMarkers: ObjectVersion[] = (response.DeleteMarkers || []).map((dm) => ({
		key: dm.Key || '',
		versionId: dm.VersionId || '',
		isLatest: dm.IsLatest || false,
		lastModified: dm.LastModified?.toISOString() || '',
		size: 0,
		isDeleteMarker: true
	}));

	return {
		versions,
		deleteMarkers,
		isTruncated: response.IsTruncated || false,
		nextKeyMarker: response.NextKeyMarker,
		nextVersionIdMarker: response.NextVersionIdMarker
	};
}

export async function restoreObjectVersion(
	client: S3Client,
	bucket: string,
	key: string,
	versionId: string
): Promise<void> {
	const encodedKey = encodeURIComponent(key);
	const copySource = `${bucket}/${encodedKey}?versionId=${versionId}`;

	await client.send(
		new CopyObjectCommand({
			Bucket: bucket,
			Key: key,
			CopySource: copySource
		})
	);
}

export async function deleteObjectVersion(
	client: S3Client,
	bucket: string,
	key: string,
	versionId: string
): Promise<void> {
	await client.send(
		new DeleteObjectCommand({
			Bucket: bucket,
			Key: key,
			VersionId: versionId
		})
	);
}

// Get a readable stream for an object (for piping into ZIP)
export async function getObjectStream(
	client: S3Client,
	bucket: string,
	key: string
): Promise<NodeJS.ReadableStream> {
	const response = await client.send(
		new GetObjectCommand({ Bucket: bucket, Key: key })
	);
	return response.Body as NodeJS.ReadableStream;
}

// Get tags for an object
export async function getObjectTags(
	client: S3Client,
	bucket: string,
	key: string
): Promise<Record<string, string>> {
	const response = await client.send(
		new GetObjectTaggingCommand({ Bucket: bucket, Key: key })
	);

	const tags: Record<string, string> = {};
	for (const tag of response.TagSet || []) {
		if (tag.Key && tag.Value !== undefined) {
			tags[tag.Key] = tag.Value;
		}
	}
	return tags;
}

// Set tags on an object
export async function setObjectTags(
	client: S3Client,
	bucket: string,
	key: string,
	tags: Record<string, string>
): Promise<void> {
	const tagSet = Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));

	await client.send(
		new PutObjectTaggingCommand({
			Bucket: bucket,
			Key: key,
			Tagging: { TagSet: tagSet }
		})
	);
}

// ── A10: Bucket Versioning ──────────────────────────────────────────────

export async function getBucketVersioning(client: S3Client, bucket: string): Promise<string> {
	const response = await client.send(new GetBucketVersioningCommand({ Bucket: bucket }));
	return response.Status === 'Enabled'
		? 'Enabled'
		: response.Status === 'Suspended'
			? 'Suspended'
			: 'Disabled';
}

export async function setBucketVersioning(
	client: S3Client,
	bucket: string,
	enabled: boolean
): Promise<void> {
	await client.send(
		new PutBucketVersioningCommand({
			Bucket: bucket,
			VersioningConfiguration: { Status: enabled ? 'Enabled' : 'Suspended' }
		})
	);
}

// ── A11: Bucket Tags ────────────────────────────────────────────────────

export async function getBucketTags(
	client: S3Client,
	bucket: string
): Promise<Record<string, string>> {
	try {
		const response = await client.send(new GetBucketTaggingCommand({ Bucket: bucket }));
		const tags: Record<string, string> = {};
		for (const tag of response.TagSet || []) {
			if (tag.Key && tag.Value !== undefined) {
				tags[tag.Key] = tag.Value;
			}
		}
		return tags;
	} catch (err: any) {
		if (err.name === 'NoSuchTagSet' || err.Code === 'NoSuchTagSet') {
			return {};
		}
		throw err;
	}
}

export async function setBucketTags(
	client: S3Client,
	bucket: string,
	tags: Record<string, string>
): Promise<void> {
	const tagSet = Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));
	await client.send(
		new PutBucketTaggingCommand({
			Bucket: bucket,
			Tagging: { TagSet: tagSet }
		})
	);
}

export async function deleteBucketTags(client: S3Client, bucket: string): Promise<void> {
	await client.send(new DeleteBucketTaggingCommand({ Bucket: bucket }));
}

// ── A12: Bucket Policy ──────────────────────────────────────────────────

export async function getBucketPolicy(
	client: S3Client,
	bucket: string
): Promise<string | null> {
	try {
		const response = await client.send(new GetBucketPolicyCommand({ Bucket: bucket }));
		return response.Policy || null;
	} catch (err: any) {
		if (
			err.name === 'NoSuchBucketPolicy' ||
			err.Code === 'NoSuchBucketPolicy'
		) {
			return null;
		}
		throw err;
	}
}

export async function setBucketPolicy(
	client: S3Client,
	bucket: string,
	policy: string
): Promise<void> {
	await client.send(
		new PutBucketPolicyCommand({
			Bucket: bucket,
			Policy: policy
		})
	);
}

export async function deleteBucketPolicy(client: S3Client, bucket: string): Promise<void> {
	await client.send(new DeleteBucketPolicyCommand({ Bucket: bucket }));
}

// ── A14: Object Legal Hold ──────────────────────────────────────────────

export async function getObjectLegalHold(
	client: S3Client,
	bucket: string,
	key: string
): Promise<string> {
	const response = await client.send(
		new GetObjectLegalHoldCommand({ Bucket: bucket, Key: key })
	);
	return response.LegalHold?.Status || 'OFF';
}

export async function setObjectLegalHold(
	client: S3Client,
	bucket: string,
	key: string,
	status: 'ON' | 'OFF'
): Promise<void> {
	await client.send(
		new PutObjectLegalHoldCommand({
			Bucket: bucket,
			Key: key,
			LegalHold: { Status: status }
		})
	);
}

// ── A15: Object Retention ───────────────────────────────────────────────

export async function getObjectRetention(
	client: S3Client,
	bucket: string,
	key: string
): Promise<{ mode: string | null; retainUntilDate: string | null }> {
	try {
		const response = await client.send(
			new GetObjectRetentionCommand({ Bucket: bucket, Key: key })
		);
		return {
			mode: response.Retention?.Mode || null,
			retainUntilDate: response.Retention?.RetainUntilDate?.toISOString() || null
		};
	} catch (err: any) {
		if (
			err.name === 'NoSuchObjectLockConfiguration' ||
			err.Code === 'NoSuchObjectLockConfiguration' ||
			err.name === 'ObjectLockConfigurationNotFoundError' ||
			err.Code === 'ObjectLockConfigurationNotFoundError'
		) {
			return { mode: null, retainUntilDate: null };
		}
		throw err;
	}
}

export async function setObjectRetention(
	client: S3Client,
	bucket: string,
	key: string,
	mode: string,
	retainUntilDate: string,
	bypassGovernance?: boolean
): Promise<void> {
	await client.send(
		new PutObjectRetentionCommand({
			Bucket: bucket,
			Key: key,
			Retention: {
				Mode: mode as 'GOVERNANCE' | 'COMPLIANCE',
				RetainUntilDate: new Date(retainUntilDate)
			},
			BypassGovernanceRetention: bypassGovernance
		})
	);
}

// ── A16: Bucket Retention Policy ────────────────────────────────────────

export async function getBucketRetention(
	client: S3Client,
	bucket: string
): Promise<{ enabled: boolean; mode?: string; days?: number; years?: number }> {
	try {
		const response = await client.send(
			new GetObjectLockConfigurationCommand({ Bucket: bucket })
		);
		const config = response.ObjectLockConfiguration;
		if (!config || config.ObjectLockEnabled !== 'Enabled') {
			return { enabled: false };
		}

		const rule = config.Rule?.DefaultRetention;
		if (!rule) {
			return { enabled: true };
		}

		return {
			enabled: true,
			mode: rule.Mode,
			days: rule.Days,
			years: rule.Years
		};
	} catch (err: any) {
		if (
			err.name === 'ObjectLockConfigurationNotFoundError' ||
			err.Code === 'ObjectLockConfigurationNotFoundError'
		) {
			return { enabled: false };
		}
		throw err;
	}
}

export async function setBucketRetention(
	client: S3Client,
	bucket: string,
	mode: string,
	days?: number,
	years?: number
): Promise<void> {
	await client.send(
		new PutObjectLockConfigurationCommand({
			Bucket: bucket,
			ObjectLockConfiguration: {
				ObjectLockEnabled: 'Enabled',
				Rule: {
					DefaultRetention: {
						Mode: mode as 'GOVERNANCE' | 'COMPLIANCE',
						Days: days,
						Years: years
					}
				}
			}
		})
	);
}

// ── Copy / Move / Rename ────────────────────────────────────────────────

export async function copyObject(
	client: S3Client,
	sourceBucket: string,
	sourceKey: string,
	destBucket: string,
	destKey: string
): Promise<void> {
	const copySource = encodeURIComponent(`${sourceBucket}/${sourceKey}`);
	await client.send(
		new CopyObjectCommand({
			Bucket: destBucket,
			Key: destKey,
			CopySource: copySource
		})
	);
}

export async function copyFolder(
	client: S3Client,
	sourceBucket: string,
	sourcePrefix: string,
	destBucket: string,
	destPrefix: string
): Promise<{ copied: number }> {
	// List all objects under sourcePrefix (no delimiter = recursive)
	let copied = 0;
	let continuationToken: string | undefined;

	do {
		const response = await client.send(
			new ListObjectsV2Command({
				Bucket: sourceBucket,
				Prefix: sourcePrefix,
				ContinuationToken: continuationToken
			})
		);

		const contents = response.Contents || [];
		for (const obj of contents) {
			if (!obj.Key) continue;
			const relativePath = obj.Key.slice(sourcePrefix.length);
			const destKey = destPrefix + relativePath;
			await copyObject(client, sourceBucket, obj.Key, destBucket, destKey);
			copied++;
		}

		continuationToken = response.NextContinuationToken;
	} while (continuationToken);

	return { copied };
}

export async function moveObject(
	client: S3Client,
	sourceBucket: string,
	sourceKey: string,
	destBucket: string,
	destKey: string
): Promise<void> {
	await copyObject(client, sourceBucket, sourceKey, destBucket, destKey);
	await deleteObject(client, sourceBucket, sourceKey);
}

export async function moveFolder(
	client: S3Client,
	sourceBucket: string,
	sourcePrefix: string,
	destBucket: string,
	destPrefix: string
): Promise<{ moved: number }> {
	const { copied } = await copyFolder(client, sourceBucket, sourcePrefix, destBucket, destPrefix);

	// Delete all source objects
	let continuationToken: string | undefined;
	do {
		const response = await client.send(
			new ListObjectsV2Command({
				Bucket: sourceBucket,
				Prefix: sourcePrefix,
				ContinuationToken: continuationToken
			})
		);

		const contents = response.Contents || [];
		for (const obj of contents) {
			if (!obj.Key) continue;
			await deleteObject(client, sourceBucket, obj.Key);
		}

		continuationToken = response.NextContinuationToken;
	} while (continuationToken);

	return { moved: copied };
}

export async function searchObjects(
	client: S3Client,
	bucket: string,
	prefix: string,
	searchTerm: string,
	maxKeys: number = 1000
): Promise<{ objects: S3Object[]; totalFound: number }> {
	const matched: S3Object[] = [];
	let totalFound = 0;
	let continuationToken: string | undefined;
	const maxPages = 5;
	let page = 0;
	const lowerSearch = searchTerm.toLowerCase();

	do {
		const command = new ListObjectsV2Command({
			Bucket: bucket,
			Prefix: prefix,
			MaxKeys: 1000,
			...(continuationToken ? { ContinuationToken: continuationToken } : {})
			// No Delimiter — this makes it recursive
		});

		const response = await client.send(command);
		const contents = response.Contents || [];
		totalFound += contents.length;

		for (const obj of contents) {
			if (!obj.Key) continue;
			if (obj.Key.toLowerCase().includes(lowerSearch)) {
				const key = obj.Key;
				const segments = key.split('/');
				const name = segments[segments.length - 1] || segments[segments.length - 2] || key;
				matched.push({
					key,
					name,
					size: obj.Size || 0,
					lastModified: obj.LastModified?.toISOString() || '',
					isFolder: false,
					etag: obj.ETag?.replace(/"/g, '')
				});
			}
			// Stop early if we have enough matches
			if (matched.length >= maxKeys) break;
		}

		if (matched.length >= maxKeys) break;

		continuationToken = response.NextContinuationToken;
		page++;
	} while (continuationToken && page < maxPages);

	return { objects: matched.slice(0, maxKeys), totalFound };
}

// ── Multipart Upload ────────────────────────────────────────────────────

/** Initiate a multipart upload — returns uploadId */
export async function initiateMultipartUpload(
	client: S3Client,
	bucket: string,
	key: string,
	contentType?: string
): Promise<{ uploadId: string }> {
	const cmd = new CreateMultipartUploadCommand({
		Bucket: bucket,
		Key: key,
		ContentType: contentType || 'application/octet-stream'
	});
	const result = await client.send(cmd);
	return { uploadId: result.UploadId! };
}

/** Generate a presigned URL for uploading a single part */
export async function getPresignedPartUrl(
	client: S3Client,
	bucket: string,
	key: string,
	uploadId: string,
	partNumber: number,
	expiresIn: number = 3600
): Promise<string> {
	const cmd = new UploadPartCommand({
		Bucket: bucket,
		Key: key,
		UploadId: uploadId,
		PartNumber: partNumber
	});
	return await getSignedUrl(client, cmd, { expiresIn });
}

/** Complete a multipart upload with the list of parts */
export async function completeMultipartUpload(
	client: S3Client,
	bucket: string,
	key: string,
	uploadId: string,
	parts: Array<{ PartNumber: number; ETag: string }>
): Promise<void> {
	const cmd = new CompleteMultipartUploadCommand({
		Bucket: bucket,
		Key: key,
		UploadId: uploadId,
		MultipartUpload: {
			Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber)
		}
	});
	await client.send(cmd);
}

/** Abort a multipart upload */
export async function abortMultipartUpload(
	client: S3Client,
	bucket: string,
	key: string,
	uploadId: string
): Promise<void> {
	const cmd = new AbortMultipartUploadCommand({
		Bucket: bucket,
		Key: key,
		UploadId: uploadId
	});
	await client.send(cmd);
}

/** List already-uploaded parts (for resume support) */
export async function listUploadParts(
	client: S3Client,
	bucket: string,
	key: string,
	uploadId: string
): Promise<Array<{ PartNumber: number; ETag: string; Size: number }>> {
	const cmd = new ListPartsCommand({
		Bucket: bucket,
		Key: key,
		UploadId: uploadId
	});
	const result = await client.send(cmd);
	return (result.Parts || []).map((p) => ({
		PartNumber: p.PartNumber!,
		ETag: p.ETag!,
		Size: p.Size!
	}));
}

// ── P3.3: Bucket CORS ──────────────────────────────────────────────────

export async function getBucketCors(
	client: S3Client,
	bucket: string
): Promise<CorsRule[]> {
	try {
		const cmd = new GetBucketCorsCommand({ Bucket: bucket });
		const result = await client.send(cmd);
		return (result.CORSRules || []).map((rule) => ({
			id: rule.ID,
			allowedOrigins: rule.AllowedOrigins || [],
			allowedMethods: rule.AllowedMethods || [],
			allowedHeaders: rule.AllowedHeaders || [],
			exposeHeaders: rule.ExposeHeaders || [],
			maxAgeSeconds: rule.MaxAgeSeconds
		}));
	} catch (err: any) {
		// NoSuchCORSConfiguration is expected when no CORS is set
		if (err.name === 'NoSuchCORSConfiguration' || err.Code === 'NoSuchCORSConfiguration') {
			return [];
		}
		throw err;
	}
}

export async function setBucketCors(
	client: S3Client,
	bucket: string,
	rules: CorsRule[]
): Promise<void> {
	const cmd = new PutBucketCorsCommand({
		Bucket: bucket,
		CORSConfiguration: {
			CORSRules: rules.map((rule) => ({
				ID: rule.id,
				AllowedOrigins: rule.allowedOrigins,
				AllowedMethods: rule.allowedMethods,
				AllowedHeaders: rule.allowedHeaders,
				ExposeHeaders: rule.exposeHeaders,
				MaxAgeSeconds: rule.maxAgeSeconds
			}))
		}
	});
	await client.send(cmd);
}

export async function deleteBucketCors(
	client: S3Client,
	bucket: string
): Promise<void> {
	const cmd = new DeleteBucketCorsCommand({ Bucket: bucket });
	await client.send(cmd);
}
