import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock AWS SDK ────────────────────────────────────────────────────────
// We capture the mock send function so tests can control responses.
const mockSend = vi.fn();

// Track constructor args
const s3ClientConstructorArgs: unknown[][] = [];

// Helper to create a command class mock that stores its params
function makeCommandClass(type: string) {
	return class {
		_type = type;
		[key: string]: unknown;
		constructor(params: Record<string, unknown>) {
			Object.assign(this, params);
		}
	};
}

vi.mock('@aws-sdk/client-s3', () => {
	// Use a real class so `new S3Client(...)` works
	class S3ClientMock {
		send = mockSend;
		constructor(...args: unknown[]) {
			s3ClientConstructorArgs.push(args);
		}
	}

	return {
		S3Client: S3ClientMock,
		ListBucketsCommand: makeCommandClass('ListBuckets'),
		ListObjectsV2Command: makeCommandClass('ListObjectsV2'),
		DeleteObjectCommand: makeCommandClass('DeleteObject'),
		PutObjectCommand: makeCommandClass('PutObject'),
		GetObjectCommand: makeCommandClass('GetObject'),
		HeadObjectCommand: makeCommandClass('HeadObject'),
		CreateBucketCommand: makeCommandClass('CreateBucket'),
		DeleteBucketCommand: makeCommandClass('DeleteBucket'),
		PutBucketVersioningCommand: makeCommandClass('PutBucketVersioning'),
		GetBucketVersioningCommand: makeCommandClass('GetBucketVersioning'),
		GetBucketTaggingCommand: makeCommandClass('GetBucketTagging'),
		PutBucketTaggingCommand: makeCommandClass('PutBucketTagging'),
		DeleteBucketTaggingCommand: makeCommandClass('DeleteBucketTagging'),
		GetBucketPolicyCommand: makeCommandClass('GetBucketPolicy'),
		PutBucketPolicyCommand: makeCommandClass('PutBucketPolicy'),
		DeleteBucketPolicyCommand: makeCommandClass('DeleteBucketPolicy'),
		GetObjectLockConfigurationCommand: makeCommandClass('GetObjectLockConfiguration'),
		PutObjectLockConfigurationCommand: makeCommandClass('PutObjectLockConfiguration'),
		GetObjectTaggingCommand: makeCommandClass('GetObjectTagging'),
		PutObjectTaggingCommand: makeCommandClass('PutObjectTagging'),
		GetObjectLegalHoldCommand: makeCommandClass('GetObjectLegalHold'),
		PutObjectLegalHoldCommand: makeCommandClass('PutObjectLegalHold'),
		GetObjectRetentionCommand: makeCommandClass('GetObjectRetention'),
		PutObjectRetentionCommand: makeCommandClass('PutObjectRetention'),
		ListObjectVersionsCommand: makeCommandClass('ListObjectVersions'),
		CopyObjectCommand: makeCommandClass('CopyObject'),
		CreateMultipartUploadCommand: makeCommandClass('CreateMultipartUpload'),
		UploadPartCommand: makeCommandClass('UploadPart'),
		CompleteMultipartUploadCommand: makeCommandClass('CompleteMultipartUpload'),
		AbortMultipartUploadCommand: makeCommandClass('AbortMultipartUpload'),
		ListPartsCommand: makeCommandClass('ListParts'),
		GetBucketCorsCommand: makeCommandClass('GetBucketCors'),
		PutBucketCorsCommand: makeCommandClass('PutBucketCors'),
		DeleteBucketCorsCommand: makeCommandClass('DeleteBucketCors')
	};
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
	getSignedUrl: vi.fn().mockResolvedValue('https://mocked-presigned-url.example.com/test')
}));

// Import after mocks are set up
import {
	createS3Client,
	listBuckets,
	listObjects,
	deleteObject,
	deleteObjects,
	createFolder,
	headObject,
	createBucket,
	deleteBucket,
	getBucketInfo,
	listObjectVersions,
	restoreObjectVersion,
	deleteObjectVersion,
	getObjectTags,
	setObjectTags,
	getBucketVersioning,
	setBucketVersioning,
	getBucketTags,
	setBucketTags,
	deleteBucketTags,
	getBucketPolicy,
	setBucketPolicy,
	deleteBucketPolicy,
	getObjectLegalHold,
	setObjectLegalHold,
	getObjectRetention,
	setObjectRetention,
	getBucketRetention,
	setBucketRetention,
	getBucketCors,
	setBucketCors,
	deleteBucketCors,
	copyObject,
	copyFolder,
	moveObject,
	moveFolder,
	searchObjects,
	initiateMultipartUpload,
	getPresignedPartUrl,
	completeMultipartUpload,
	abortMultipartUpload,
	listUploadParts
} from './s3';

// Helper to create a client for tests
function makeClient() {
	return createS3Client({
		accessKeyId: 'test-key',
		secretAccessKey: 'test-secret',
		region: 'us-east-1'
	});
}

// Helper to get the last constructor args
function lastConstructorConfig(): Record<string, unknown> {
	return s3ClientConstructorArgs[s3ClientConstructorArgs.length - 1][0] as Record<string, unknown>;
}

beforeEach(() => {
	vi.clearAllMocks();
	s3ClientConstructorArgs.length = 0;
});

// ── createS3Client ──────────────────────────────────────────────────────

describe('createS3Client', () => {
	it('creates client with endpoint and forcePathStyle', () => {
		createS3Client({
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
			region: 'us-east-1',
			endpoint: 'http://localhost:9000'
		});

		const config = lastConstructorConfig();
		expect(config.region).toBe('us-east-1');
		expect(config.endpoint).toBe('http://localhost:9000');
		expect(config.forcePathStyle).toBe(true);
		expect(config.credentials).toEqual({
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret'
		});
	});

	it('creates client without endpoint (AWS mode)', () => {
		createS3Client({
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
			region: 'eu-west-1'
		});

		const config = lastConstructorConfig();
		expect(config.region).toBe('eu-west-1');
		expect(config.endpoint).toBeUndefined();
		expect(config.forcePathStyle).toBeUndefined();
	});

	it('defaults region to us-east-1 when empty', () => {
		createS3Client({
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
			region: ''
		});

		const config = lastConstructorConfig();
		expect(config.region).toBe('us-east-1');
	});
});

// ── listBuckets ─────────────────────────────────────────────────────────

describe('listBuckets', () => {
	it('maps S3 response to BucketInfo array', async () => {
		mockSend.mockResolvedValueOnce({
			Buckets: [
				{ Name: 'bucket-1', CreationDate: new Date('2024-01-15T10:00:00Z') },
				{ Name: 'bucket-2', CreationDate: new Date('2024-06-20T15:30:00Z') }
			]
		});

		const result = await listBuckets(makeClient());

		expect(result).toEqual([
			{ name: 'bucket-1', creationDate: '2024-01-15T10:00:00.000Z' },
			{ name: 'bucket-2', creationDate: '2024-06-20T15:30:00.000Z' }
		]);
	});

	it('returns empty array when no buckets', async () => {
		mockSend.mockResolvedValueOnce({ Buckets: undefined });

		const result = await listBuckets(makeClient());
		expect(result).toEqual([]);
	});

	it('handles bucket with missing name', async () => {
		mockSend.mockResolvedValueOnce({
			Buckets: [{ Name: undefined, CreationDate: undefined }]
		});

		const result = await listBuckets(makeClient());
		expect(result).toEqual([{ name: '', creationDate: undefined }]);
	});
});

// ── listObjects ─────────────────────────────────────────────────────────

describe('listObjects', () => {
	it('maps folders and files correctly', async () => {
		mockSend.mockResolvedValueOnce({
			CommonPrefixes: [{ Prefix: 'documents/' }, { Prefix: 'images/' }],
			Contents: [
				{
					Key: 'hello.txt',
					Size: 100,
					LastModified: new Date('2024-01-01T00:00:00Z'),
					ETag: '"abc123"'
				},
				{
					Key: 'test.json',
					Size: 50,
					LastModified: new Date('2024-02-01T00:00:00Z'),
					ETag: '"def456"'
				}
			],
			IsTruncated: false,
			NextContinuationToken: undefined
		});

		const result = await listObjects(makeClient(), 'test-bucket');

		// Folders come first
		expect(result.objects[0]).toEqual({
			key: 'documents/',
			name: 'documents',
			size: 0,
			lastModified: '',
			isFolder: true
		});
		expect(result.objects[1]).toEqual({
			key: 'images/',
			name: 'images',
			size: 0,
			lastModified: '',
			isFolder: true
		});

		// Then files
		expect(result.objects[2]).toEqual({
			key: 'hello.txt',
			name: 'hello.txt',
			size: 100,
			lastModified: '2024-01-01T00:00:00.000Z',
			isFolder: false,
			etag: 'abc123'
		});

		expect(result.bucket).toBe('test-bucket');
		expect(result.prefix).toBe('');
		expect(result.isTruncated).toBe(false);
		expect(result.folders).toEqual(['documents/', 'images/']);
	});

	it('excludes the prefix marker itself from files', async () => {
		mockSend.mockResolvedValueOnce({
			CommonPrefixes: [],
			Contents: [
				{ Key: 'documents/', Size: 0, LastModified: new Date(), ETag: '""' },
				{ Key: 'documents/readme.txt', Size: 50, LastModified: new Date(), ETag: '"abc"' }
			],
			IsTruncated: false
		});

		const result = await listObjects(makeClient(), 'test-bucket', 'documents/');

		const fileKeys = result.objects.map((o) => o.key);
		expect(fileKeys).not.toContain('documents/');
		expect(fileKeys).toContain('documents/readme.txt');
	});

	it('strips prefix from file names', async () => {
		mockSend.mockResolvedValueOnce({
			CommonPrefixes: [{ Prefix: 'docs/config/' }],
			Contents: [
				{ Key: 'docs/readme.txt', Size: 50, LastModified: new Date(), ETag: '"abc"' }
			],
			IsTruncated: false
		});

		const result = await listObjects(makeClient(), 'test-bucket', 'docs/');

		const file = result.objects.find((o) => !o.isFolder);
		expect(file?.name).toBe('readme.txt');

		const folder = result.objects.find((o) => o.isFolder);
		expect(folder?.name).toBe('config');
	});

	it('handles empty response', async () => {
		mockSend.mockResolvedValueOnce({
			CommonPrefixes: undefined,
			Contents: undefined,
			IsTruncated: false
		});

		const result = await listObjects(makeClient(), 'empty-bucket');

		expect(result.objects).toEqual([]);
		expect(result.folders).toEqual([]);
		expect(result.isTruncated).toBe(false);
	});

	it('passes continuationToken and maxKeys to command', async () => {
		mockSend.mockResolvedValueOnce({
			CommonPrefixes: [],
			Contents: [],
			IsTruncated: false
		});

		await listObjects(makeClient(), 'bucket', 'prefix/', 'token-123', 50);

		// Verify the command was constructed with correct params
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				Bucket: 'bucket',
				Prefix: 'prefix/',
				Delimiter: '/',
				MaxKeys: 50,
				ContinuationToken: 'token-123'
			})
		);
	});

	it('returns continuationToken when truncated', async () => {
		mockSend.mockResolvedValueOnce({
			CommonPrefixes: [],
			Contents: [{ Key: 'file.txt', Size: 10, LastModified: new Date(), ETag: '"a"' }],
			IsTruncated: true,
			NextContinuationToken: 'next-page-token'
		});

		const result = await listObjects(makeClient(), 'bucket');

		expect(result.isTruncated).toBe(true);
		expect(result.continuationToken).toBe('next-page-token');
	});
});

// ── deleteObject / deleteObjects ────────────────────────────────────────

describe('deleteObject', () => {
	it('sends DeleteObjectCommand with correct params', async () => {
		mockSend.mockResolvedValueOnce({});

		await deleteObject(makeClient(), 'my-bucket', 'path/to/file.txt');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'DeleteObject',
				Bucket: 'my-bucket',
				Key: 'path/to/file.txt'
			})
		);
	});
});

describe('deleteObjects', () => {
	it('deletes multiple objects sequentially', async () => {
		mockSend.mockResolvedValue({});

		await deleteObjects(makeClient(), 'bucket', ['file1.txt', 'file2.txt', 'file3.txt']);

		expect(mockSend).toHaveBeenCalledTimes(3);
	});
});

// ── createFolder ────────────────────────────────────────────────────────

describe('createFolder', () => {
	it('appends trailing slash to key', async () => {
		mockSend.mockResolvedValueOnce({});

		await createFolder(makeClient(), 'bucket', 'my-folder');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'PutObject',
				Bucket: 'bucket',
				Key: 'my-folder/',
				Body: ''
			})
		);
	});

	it('does not double-append slash if already present', async () => {
		mockSend.mockResolvedValueOnce({});

		await createFolder(makeClient(), 'bucket', 'my-folder/');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				Key: 'my-folder/'
			})
		);
	});
});

// ── headObject ──────────────────────────────────────────────────────────

describe('headObject', () => {
	it('maps all metadata fields correctly', async () => {
		mockSend.mockResolvedValueOnce({
			ContentLength: 1024,
			LastModified: new Date('2024-03-15T12:00:00Z'),
			ContentType: 'application/json',
			ETag: '"abc123def456"',
			StorageClass: 'STANDARD',
			VersionId: 'v1',
			Metadata: { 'x-custom': 'value' }
		});

		const result = await headObject(makeClient(), 'bucket', 'data.json');

		expect(result).toEqual({
			key: 'data.json',
			bucket: 'bucket',
			size: 1024,
			lastModified: '2024-03-15T12:00:00.000Z',
			contentType: 'application/json',
			etag: 'abc123def456',
			storageClass: 'STANDARD',
			versionId: 'v1',
			metadata: { 'x-custom': 'value' }
		});
	});

	it('strips quotes from ETag', async () => {
		mockSend.mockResolvedValueOnce({
			ContentLength: 0,
			ContentType: 'text/plain',
			ETag: '"quoted-etag"',
			Metadata: {}
		});

		const result = await headObject(makeClient(), 'bucket', 'file.txt');
		expect(result.etag).toBe('quoted-etag');
	});

	it('handles missing optional fields', async () => {
		mockSend.mockResolvedValueOnce({
			ContentLength: undefined,
			LastModified: undefined,
			ContentType: undefined,
			ETag: undefined,
			StorageClass: undefined,
			VersionId: undefined,
			Metadata: undefined
		});

		const result = await headObject(makeClient(), 'bucket', 'file.txt');

		expect(result.size).toBe(0);
		expect(result.lastModified).toBe('');
		expect(result.contentType).toBe('application/octet-stream');
		expect(result.etag).toBe('');
		expect(result.storageClass).toBeUndefined();
		expect(result.versionId).toBeUndefined();
		expect(result.metadata).toEqual({});
	});
});

// ── createBucket ────────────────────────────────────────────────────────

describe('createBucket', () => {
	it('creates bucket with basic params', async () => {
		mockSend.mockResolvedValueOnce({});

		await createBucket(makeClient(), 'new-bucket');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'CreateBucket',
				Bucket: 'new-bucket'
			})
		);
	});

	it('creates bucket with versioning enabled', async () => {
		mockSend.mockResolvedValue({}); // CreateBucket + PutBucketVersioning

		await createBucket(makeClient(), 'versioned-bucket', { versioning: true });

		// Should call send twice: CreateBucket + PutBucketVersioning
		expect(mockSend).toHaveBeenCalledTimes(2);
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'PutBucketVersioning',
				Bucket: 'versioned-bucket',
				VersioningConfiguration: { Status: 'Enabled' }
			})
		);
	});

	it('creates bucket with object locking (skips separate versioning call)', async () => {
		mockSend.mockResolvedValue({});

		await createBucket(makeClient(), 'locked-bucket', {
			versioning: true,
			objectLocking: true
		});

		// Should call send only once: CreateBucket (with ObjectLockEnabledForBucket)
		expect(mockSend).toHaveBeenCalledTimes(1);
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'CreateBucket',
				Bucket: 'locked-bucket',
				ObjectLockEnabledForBucket: true
			})
		);
	});
});

// ── deleteBucket ────────────────────────────────────────────────────────

describe('deleteBucket', () => {
	it('sends DeleteBucketCommand', async () => {
		mockSend.mockResolvedValueOnce({});

		await deleteBucket(makeClient(), 'old-bucket');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'DeleteBucket',
				Bucket: 'old-bucket'
			})
		);
	});
});

// ── getBucketInfo ───────────────────────────────────────────────────────

describe('getBucketInfo', () => {
	it('aggregates versioning, tags, and lock config', async () => {
		// GetBucketVersioning
		mockSend.mockResolvedValueOnce({ Status: 'Enabled' });
		// GetBucketTagging
		mockSend.mockResolvedValueOnce({
			TagSet: [{ Key: 'env', Value: 'prod' }]
		});
		// GetObjectLockConfiguration
		mockSend.mockResolvedValueOnce({
			ObjectLockConfiguration: { ObjectLockEnabled: 'Enabled' }
		});

		const result = await getBucketInfo(makeClient(), 'my-bucket');

		expect(result).toEqual({
			name: 'my-bucket',
			versioning: 'Enabled',
			objectLocking: true,
			tags: { env: 'prod' }
		});
	});

	it('handles Suspended versioning', async () => {
		mockSend.mockResolvedValueOnce({ Status: 'Suspended' });
		mockSend.mockResolvedValueOnce({ TagSet: [] });
		mockSend.mockResolvedValueOnce({
			ObjectLockConfiguration: { ObjectLockEnabled: 'Disabled' }
		});

		const result = await getBucketInfo(makeClient(), 'bucket');
		expect(result.versioning).toBe('Suspended');
	});

	it('handles Disabled versioning (no Status)', async () => {
		mockSend.mockResolvedValueOnce({ Status: undefined });
		mockSend.mockResolvedValueOnce({ TagSet: [] });
		mockSend.mockResolvedValueOnce({ ObjectLockConfiguration: {} });

		const result = await getBucketInfo(makeClient(), 'bucket');
		expect(result.versioning).toBe('Disabled');
	});

	it('handles NoSuchTagSet error gracefully', async () => {
		mockSend.mockResolvedValueOnce({ Status: 'Enabled' });
		mockSend.mockRejectedValueOnce({ name: 'NoSuchTagSet' });
		mockSend.mockResolvedValueOnce({ ObjectLockConfiguration: {} });

		const result = await getBucketInfo(makeClient(), 'bucket');
		expect(result.tags).toEqual({});
	});

	it('handles ObjectLockConfigurationNotFoundError gracefully', async () => {
		mockSend.mockResolvedValueOnce({ Status: 'Enabled' });
		mockSend.mockResolvedValueOnce({ TagSet: [] });
		mockSend.mockRejectedValueOnce({ name: 'ObjectLockConfigurationNotFoundError' });

		const result = await getBucketInfo(makeClient(), 'bucket');
		expect(result.objectLocking).toBe(false);
	});

	it('re-throws unexpected errors from tagging', async () => {
		mockSend.mockResolvedValueOnce({ Status: 'Enabled' });
		mockSend.mockRejectedValueOnce(new Error('NetworkError'));

		await expect(getBucketInfo(makeClient(), 'bucket')).rejects.toThrow('NetworkError');
	});
});

// ── listObjectVersions ──────────────────────────────────────────────────

describe('listObjectVersions', () => {
	it('maps versions and delete markers', async () => {
		mockSend.mockResolvedValueOnce({
			Versions: [
				{
					Key: 'file.txt',
					VersionId: 'v2',
					IsLatest: true,
					LastModified: new Date('2024-06-01T00:00:00Z'),
					Size: 200,
					ETag: '"etag2"',
					StorageClass: 'STANDARD'
				},
				{
					Key: 'file.txt',
					VersionId: 'v1',
					IsLatest: false,
					LastModified: new Date('2024-01-01T00:00:00Z'),
					Size: 100,
					ETag: '"etag1"',
					StorageClass: 'STANDARD'
				}
			],
			DeleteMarkers: [
				{
					Key: 'deleted.txt',
					VersionId: 'dm1',
					IsLatest: true,
					LastModified: new Date('2024-07-01T00:00:00Z')
				}
			],
			IsTruncated: false,
			NextKeyMarker: undefined,
			NextVersionIdMarker: undefined
		});

		const result = await listObjectVersions(makeClient(), 'bucket', 'file.txt');

		expect(result.versions).toHaveLength(2);
		expect(result.versions[0]).toEqual({
			key: 'file.txt',
			versionId: 'v2',
			isLatest: true,
			lastModified: '2024-06-01T00:00:00.000Z',
			size: 200,
			etag: 'etag2',
			isDeleteMarker: false,
			storageClass: 'STANDARD'
		});

		expect(result.deleteMarkers).toHaveLength(1);
		expect(result.deleteMarkers[0]).toEqual({
			key: 'deleted.txt',
			versionId: 'dm1',
			isLatest: true,
			lastModified: '2024-07-01T00:00:00.000Z',
			size: 0,
			isDeleteMarker: true
		});

		expect(result.isTruncated).toBe(false);
	});

	it('handles empty versions response', async () => {
		mockSend.mockResolvedValueOnce({
			Versions: undefined,
			DeleteMarkers: undefined,
			IsTruncated: false
		});

		const result = await listObjectVersions(makeClient(), 'bucket', 'file.txt');

		expect(result.versions).toEqual([]);
		expect(result.deleteMarkers).toEqual([]);
	});
});

// ── restoreObjectVersion ────────────────────────────────────────────────

describe('restoreObjectVersion', () => {
	it('constructs correct CopySource with URL encoding', async () => {
		mockSend.mockResolvedValueOnce({});

		await restoreObjectVersion(makeClient(), 'bucket', 'path/to/file.txt', 'version-123');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'CopyObject',
				Bucket: 'bucket',
				Key: 'path/to/file.txt',
				CopySource: 'bucket/path%2Fto%2Ffile.txt?versionId=version-123'
			})
		);
	});
});

// ── deleteObjectVersion ─────────────────────────────────────────────────

describe('deleteObjectVersion', () => {
	it('sends DeleteObjectCommand with VersionId', async () => {
		mockSend.mockResolvedValueOnce({});

		await deleteObjectVersion(makeClient(), 'bucket', 'file.txt', 'v1');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'DeleteObject',
				Bucket: 'bucket',
				Key: 'file.txt',
				VersionId: 'v1'
			})
		);
	});
});

// ── getObjectTags / setObjectTags ───────────────────────────────────────

describe('getObjectTags', () => {
	it('returns tags as key-value object', async () => {
		mockSend.mockResolvedValueOnce({
			TagSet: [
				{ Key: 'env', Value: 'prod' },
				{ Key: 'team', Value: 'backend' }
			]
		});

		const tags = await getObjectTags(makeClient(), 'bucket', 'file.txt');
		expect(tags).toEqual({ env: 'prod', team: 'backend' });
	});

	it('returns empty object when no tags', async () => {
		mockSend.mockResolvedValueOnce({ TagSet: [] });

		const tags = await getObjectTags(makeClient(), 'bucket', 'file.txt');
		expect(tags).toEqual({});
	});
});

describe('setObjectTags', () => {
	it('converts key-value object to TagSet', async () => {
		mockSend.mockResolvedValueOnce({});

		await setObjectTags(makeClient(), 'bucket', 'file.txt', { env: 'prod', team: 'backend' });

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'PutObjectTagging',
				Bucket: 'bucket',
				Key: 'file.txt',
				Tagging: {
					TagSet: expect.arrayContaining([
						{ Key: 'env', Value: 'prod' },
						{ Key: 'team', Value: 'backend' }
					])
				}
			})
		);
	});
});

// ── getBucketVersioning / setBucketVersioning ────────────────────────────

describe('getBucketVersioning', () => {
	it('returns Enabled when versioning is on', async () => {
		mockSend.mockResolvedValueOnce({ Status: 'Enabled' });
		expect(await getBucketVersioning(makeClient(), 'bucket')).toBe('Enabled');
	});

	it('returns Suspended when versioning is suspended', async () => {
		mockSend.mockResolvedValueOnce({ Status: 'Suspended' });
		expect(await getBucketVersioning(makeClient(), 'bucket')).toBe('Suspended');
	});

	it('returns Disabled when no versioning status', async () => {
		mockSend.mockResolvedValueOnce({ Status: undefined });
		expect(await getBucketVersioning(makeClient(), 'bucket')).toBe('Disabled');
	});
});

describe('setBucketVersioning', () => {
	it('enables versioning', async () => {
		mockSend.mockResolvedValueOnce({});

		await setBucketVersioning(makeClient(), 'bucket', true);

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'PutBucketVersioning',
				Bucket: 'bucket',
				VersioningConfiguration: { Status: 'Enabled' }
			})
		);
	});

	it('suspends versioning', async () => {
		mockSend.mockResolvedValueOnce({});

		await setBucketVersioning(makeClient(), 'bucket', false);

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				VersioningConfiguration: { Status: 'Suspended' }
			})
		);
	});
});

// ── getBucketTags / setBucketTags / deleteBucketTags ─────────────────────

describe('getBucketTags', () => {
	it('returns tags as key-value object', async () => {
		mockSend.mockResolvedValueOnce({
			TagSet: [{ Key: 'env', Value: 'staging' }]
		});

		const tags = await getBucketTags(makeClient(), 'bucket');
		expect(tags).toEqual({ env: 'staging' });
	});

	it('returns empty object on NoSuchTagSet', async () => {
		mockSend.mockRejectedValueOnce({ name: 'NoSuchTagSet' });

		const tags = await getBucketTags(makeClient(), 'bucket');
		expect(tags).toEqual({});
	});

	it('returns empty object on NoSuchTagSet (Code variant)', async () => {
		mockSend.mockRejectedValueOnce({ Code: 'NoSuchTagSet' });

		const tags = await getBucketTags(makeClient(), 'bucket');
		expect(tags).toEqual({});
	});

	it('re-throws unexpected errors', async () => {
		mockSend.mockRejectedValueOnce(new Error('AccessDenied'));

		await expect(getBucketTags(makeClient(), 'bucket')).rejects.toThrow('AccessDenied');
	});
});

describe('setBucketTags', () => {
	it('converts tags to TagSet', async () => {
		mockSend.mockResolvedValueOnce({});

		await setBucketTags(makeClient(), 'bucket', { env: 'prod' });

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'PutBucketTagging',
				Bucket: 'bucket',
				Tagging: {
					TagSet: [{ Key: 'env', Value: 'prod' }]
				}
			})
		);
	});
});

describe('deleteBucketTags', () => {
	it('sends DeleteBucketTaggingCommand', async () => {
		mockSend.mockResolvedValueOnce({});

		await deleteBucketTags(makeClient(), 'bucket');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'DeleteBucketTagging',
				Bucket: 'bucket'
			})
		);
	});
});

// ── getBucketPolicy / setBucketPolicy / deleteBucketPolicy ──────────────

describe('getBucketPolicy', () => {
	it('returns policy string', async () => {
		const policy = JSON.stringify({ Version: '2012-10-17', Statement: [] });
		mockSend.mockResolvedValueOnce({ Policy: policy });

		const result = await getBucketPolicy(makeClient(), 'bucket');
		expect(result).toBe(policy);
	});

	it('returns null when no policy exists', async () => {
		mockSend.mockRejectedValueOnce({ name: 'NoSuchBucketPolicy' });

		const result = await getBucketPolicy(makeClient(), 'bucket');
		expect(result).toBeNull();
	});

	it('returns null when no policy exists (Code variant)', async () => {
		mockSend.mockRejectedValueOnce({ Code: 'NoSuchBucketPolicy' });

		const result = await getBucketPolicy(makeClient(), 'bucket');
		expect(result).toBeNull();
	});

	it('re-throws unexpected errors', async () => {
		mockSend.mockRejectedValueOnce(new Error('InternalError'));

		await expect(getBucketPolicy(makeClient(), 'bucket')).rejects.toThrow('InternalError');
	});
});

describe('setBucketPolicy', () => {
	it('sends PutBucketPolicyCommand', async () => {
		mockSend.mockResolvedValueOnce({});
		const policy = '{"Version":"2012-10-17","Statement":[]}';

		await setBucketPolicy(makeClient(), 'bucket', policy);

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'PutBucketPolicy',
				Bucket: 'bucket',
				Policy: policy
			})
		);
	});
});

describe('deleteBucketPolicy', () => {
	it('sends DeleteBucketPolicyCommand', async () => {
		mockSend.mockResolvedValueOnce({});

		await deleteBucketPolicy(makeClient(), 'bucket');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'DeleteBucketPolicy',
				Bucket: 'bucket'
			})
		);
	});
});

// ── getObjectLegalHold / setObjectLegalHold ──────────────────────────────

describe('getObjectLegalHold', () => {
	it('returns ON when legal hold is active', async () => {
		mockSend.mockResolvedValueOnce({ LegalHold: { Status: 'ON' } });

		const result = await getObjectLegalHold(makeClient(), 'bucket', 'file.txt');
		expect(result).toBe('ON');
	});

	it('returns OFF when no legal hold', async () => {
		mockSend.mockResolvedValueOnce({ LegalHold: { Status: undefined } });

		const result = await getObjectLegalHold(makeClient(), 'bucket', 'file.txt');
		expect(result).toBe('OFF');
	});
});

describe('setObjectLegalHold', () => {
	it('sets legal hold ON', async () => {
		mockSend.mockResolvedValueOnce({});

		await setObjectLegalHold(makeClient(), 'bucket', 'file.txt', 'ON');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'PutObjectLegalHold',
				Bucket: 'bucket',
				Key: 'file.txt',
				LegalHold: { Status: 'ON' }
			})
		);
	});

	it('sets legal hold OFF', async () => {
		mockSend.mockResolvedValueOnce({});

		await setObjectLegalHold(makeClient(), 'bucket', 'file.txt', 'OFF');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				LegalHold: { Status: 'OFF' }
			})
		);
	});
});

// ── getObjectRetention / setObjectRetention ─────────────────────────────

describe('getObjectRetention', () => {
	it('returns retention mode and date', async () => {
		mockSend.mockResolvedValueOnce({
			Retention: {
				Mode: 'GOVERNANCE',
				RetainUntilDate: new Date('2025-12-31T00:00:00Z')
			}
		});

		const result = await getObjectRetention(makeClient(), 'bucket', 'file.txt');
		expect(result).toEqual({
			mode: 'GOVERNANCE',
			retainUntilDate: '2025-12-31T00:00:00.000Z'
		});
	});

	it('returns null values when no retention configured', async () => {
		mockSend.mockRejectedValueOnce({ name: 'NoSuchObjectLockConfiguration' });

		const result = await getObjectRetention(makeClient(), 'bucket', 'file.txt');
		expect(result).toEqual({ mode: null, retainUntilDate: null });
	});

	it('returns null values for ObjectLockConfigurationNotFoundError', async () => {
		mockSend.mockRejectedValueOnce({ name: 'ObjectLockConfigurationNotFoundError' });

		const result = await getObjectRetention(makeClient(), 'bucket', 'file.txt');
		expect(result).toEqual({ mode: null, retainUntilDate: null });
	});
});

describe('setObjectRetention', () => {
	it('sets GOVERNANCE retention', async () => {
		mockSend.mockResolvedValueOnce({});

		await setObjectRetention(makeClient(), 'bucket', 'file.txt', 'GOVERNANCE', '2025-12-31T00:00:00Z');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'PutObjectRetention',
				Bucket: 'bucket',
				Key: 'file.txt',
				Retention: {
					Mode: 'GOVERNANCE',
					RetainUntilDate: new Date('2025-12-31T00:00:00Z')
				}
			})
		);
	});

	it('passes bypassGovernance flag', async () => {
		mockSend.mockResolvedValueOnce({});

		await setObjectRetention(makeClient(), 'bucket', 'file.txt', 'GOVERNANCE', '2025-12-31T00:00:00Z', true);

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				BypassGovernanceRetention: true
			})
		);
	});
});

// ── getBucketRetention / setBucketRetention ──────────────────────────────

describe('getBucketRetention', () => {
	it('returns enabled with default retention rule', async () => {
		mockSend.mockResolvedValueOnce({
			ObjectLockConfiguration: {
				ObjectLockEnabled: 'Enabled',
				Rule: {
					DefaultRetention: {
						Mode: 'GOVERNANCE',
						Days: 30
					}
				}
			}
		});

		const result = await getBucketRetention(makeClient(), 'bucket');
		expect(result).toEqual({
			enabled: true,
			mode: 'GOVERNANCE',
			days: 30,
			years: undefined
		});
	});

	it('returns enabled without rule when no default retention', async () => {
		mockSend.mockResolvedValueOnce({
			ObjectLockConfiguration: {
				ObjectLockEnabled: 'Enabled',
				Rule: undefined
			}
		});

		const result = await getBucketRetention(makeClient(), 'bucket');
		expect(result).toEqual({ enabled: true });
	});

	it('returns disabled when lock not configured', async () => {
		mockSend.mockRejectedValueOnce({ name: 'ObjectLockConfigurationNotFoundError' });

		const result = await getBucketRetention(makeClient(), 'bucket');
		expect(result).toEqual({ enabled: false });
	});

	it('returns disabled when ObjectLockEnabled is not Enabled', async () => {
		mockSend.mockResolvedValueOnce({
			ObjectLockConfiguration: {
				ObjectLockEnabled: undefined
			}
		});

		const result = await getBucketRetention(makeClient(), 'bucket');
		expect(result).toEqual({ enabled: false });
	});

	it('returns retention with years instead of days', async () => {
		mockSend.mockResolvedValueOnce({
			ObjectLockConfiguration: {
				ObjectLockEnabled: 'Enabled',
				Rule: {
					DefaultRetention: {
						Mode: 'COMPLIANCE',
						Years: 5
					}
				}
			}
		});

		const result = await getBucketRetention(makeClient(), 'bucket');
		expect(result).toEqual({
			enabled: true,
			mode: 'COMPLIANCE',
			days: undefined,
			years: 5
		});
	});
});

describe('setBucketRetention', () => {
	it('sets GOVERNANCE retention with days', async () => {
		mockSend.mockResolvedValueOnce({});

		await setBucketRetention(makeClient(), 'bucket', 'GOVERNANCE', 30);

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'PutObjectLockConfiguration',
				Bucket: 'bucket',
				ObjectLockConfiguration: {
					ObjectLockEnabled: 'Enabled',
					Rule: {
						DefaultRetention: {
							Mode: 'GOVERNANCE',
							Days: 30,
							Years: undefined
						}
					}
				}
			})
		);
	});

	it('sets COMPLIANCE retention with years', async () => {
		mockSend.mockResolvedValueOnce({});

		await setBucketRetention(makeClient(), 'bucket', 'COMPLIANCE', undefined, 5);

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				ObjectLockConfiguration: {
					ObjectLockEnabled: 'Enabled',
					Rule: {
						DefaultRetention: {
							Mode: 'COMPLIANCE',
							Days: undefined,
							Years: 5
						}
					}
				}
			})
		);
	});
});

// ── Copy / Move / Rename ────────────────────────────────────────────────

describe('copyObject', () => {
	it('sends CopyObjectCommand with correct params', async () => {
		mockSend.mockResolvedValueOnce({});

		await copyObject(makeClient(), 'src-bucket', 'file.txt', 'dest-bucket', 'copy.txt');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'CopyObject',
				Bucket: 'dest-bucket',
				Key: 'copy.txt',
				CopySource: encodeURIComponent('src-bucket/file.txt')
			})
		);
	});

	it('URL-encodes the copy source', async () => {
		mockSend.mockResolvedValueOnce({});

		await copyObject(makeClient(), 'bucket', 'path/with spaces/file (1).txt', 'bucket', 'dest.txt');

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'CopyObject',
				CopySource: encodeURIComponent('bucket/path/with spaces/file (1).txt')
			})
		);
	});
});

describe('copyFolder', () => {
	it('lists and copies all objects under prefix', async () => {
		// First call: ListObjectsV2 returns objects
		mockSend.mockResolvedValueOnce({
			Contents: [
				{ Key: 'src/file1.txt' },
				{ Key: 'src/file2.txt' },
				{ Key: 'src/sub/file3.txt' }
			],
			NextContinuationToken: undefined
		});
		// Three CopyObject calls
		mockSend.mockResolvedValueOnce({});
		mockSend.mockResolvedValueOnce({});
		mockSend.mockResolvedValueOnce({});

		const result = await copyFolder(makeClient(), 'bucket', 'src/', 'bucket', 'dest/');

		expect(result.copied).toBe(3);
		// Verify the copy commands were called with correct dest keys
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'CopyObject',
				Bucket: 'bucket',
				Key: 'dest/file1.txt'
			})
		);
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'CopyObject',
				Bucket: 'bucket',
				Key: 'dest/sub/file3.txt'
			})
		);
	});

	it('returns count of copied objects', async () => {
		mockSend.mockResolvedValueOnce({
			Contents: [{ Key: 'src/a.txt' }, { Key: 'src/b.txt' }],
			NextContinuationToken: undefined
		});
		mockSend.mockResolvedValueOnce({});
		mockSend.mockResolvedValueOnce({});

		const result = await copyFolder(makeClient(), 'bucket', 'src/', 'bucket', 'dest/');
		expect(result.copied).toBe(2);
	});

	it('handles empty folder', async () => {
		mockSend.mockResolvedValueOnce({
			Contents: [],
			NextContinuationToken: undefined
		});

		const result = await copyFolder(makeClient(), 'bucket', 'empty/', 'bucket', 'dest/');
		expect(result.copied).toBe(0);
	});
});

describe('moveObject', () => {
	it('copies then deletes the source', async () => {
		// CopyObject
		mockSend.mockResolvedValueOnce({});
		// DeleteObject
		mockSend.mockResolvedValueOnce({});

		await moveObject(makeClient(), 'bucket', 'old.txt', 'bucket', 'new.txt');

		expect(mockSend).toHaveBeenCalledTimes(2);
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'CopyObject',
				Bucket: 'bucket',
				Key: 'new.txt'
			})
		);
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'DeleteObject',
				Bucket: 'bucket',
				Key: 'old.txt'
			})
		);
	});
});

describe('moveFolder', () => {
	it('copies all then deletes all source objects', async () => {
		// copyFolder: ListObjectsV2
		mockSend.mockResolvedValueOnce({
			Contents: [{ Key: 'src/a.txt' }, { Key: 'src/b.txt' }],
			NextContinuationToken: undefined
		});
		// copyFolder: 2x CopyObject
		mockSend.mockResolvedValueOnce({});
		mockSend.mockResolvedValueOnce({});
		// moveFolder: ListObjectsV2 for delete
		mockSend.mockResolvedValueOnce({
			Contents: [{ Key: 'src/a.txt' }, { Key: 'src/b.txt' }],
			NextContinuationToken: undefined
		});
		// moveFolder: 2x DeleteObject
		mockSend.mockResolvedValueOnce({});
		mockSend.mockResolvedValueOnce({});

		const result = await moveFolder(makeClient(), 'bucket', 'src/', 'bucket', 'dest/');

		expect(result.moved).toBe(2);
		// Verify delete calls
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'DeleteObject',
				Bucket: 'bucket',
				Key: 'src/a.txt'
			})
		);
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'DeleteObject',
				Bucket: 'bucket',
				Key: 'src/b.txt'
			})
		);
	});
});

// ── searchObjects ───────────────────────────────────────────────────────

describe('searchObjects', () => {
	it('searches recursively without delimiter', async () => {
		mockSend.mockResolvedValueOnce({
			Contents: [
				{ Key: 'docs/readme.txt', Size: 100, LastModified: new Date() },
				{ Key: 'docs/sub/notes.txt', Size: 200, LastModified: new Date() },
				{ Key: 'images/photo.jpg', Size: 300, LastModified: new Date() }
			],
			IsTruncated: false
		});
		const result = await searchObjects(makeClient(), 'bucket', '', 'txt');
		expect(result.objects).toHaveLength(2); // Only .txt files match
		expect(result.objects[0].key).toBe('docs/readme.txt');
		expect(result.objects[1].key).toBe('docs/sub/notes.txt');
		// Verify no Delimiter was sent (the command should NOT have a Delimiter property)
		const sentCommand = mockSend.mock.calls[0][0];
		expect(sentCommand._type).toBe('ListObjectsV2');
		expect(sentCommand.Bucket).toBe('bucket');
		expect(sentCommand.Prefix).toBe('');
		expect(sentCommand.Delimiter).toBeUndefined();
	});

	it('filters by search term case-insensitively', async () => {
		mockSend.mockResolvedValueOnce({
			Contents: [
				{ Key: 'README.md', Size: 100, LastModified: new Date() },
				{ Key: 'src/readme.txt', Size: 200, LastModified: new Date() },
				{ Key: 'other.js', Size: 300, LastModified: new Date() }
			],
			IsTruncated: false
		});
		const result = await searchObjects(makeClient(), 'bucket', '', 'readme');
		expect(result.objects).toHaveLength(2);
	});

	it('respects prefix scope', async () => {
		mockSend.mockResolvedValueOnce({
			Contents: [
				{ Key: 'docs/readme.txt', Size: 100, LastModified: new Date() }
			],
			IsTruncated: false
		});
		await searchObjects(makeClient(), 'bucket', 'docs/', 'readme');
		const sentCommand = mockSend.mock.calls[0][0];
		expect(sentCommand.Prefix).toBe('docs/');
	});

	it('auto-paginates to find matches', async () => {
		mockSend
			.mockResolvedValueOnce({
				Contents: [{ Key: 'a.txt', Size: 1, LastModified: new Date() }],
				IsTruncated: true,
				NextContinuationToken: 'token1'
			})
			.mockResolvedValueOnce({
				Contents: [{ Key: 'b-match.txt', Size: 1, LastModified: new Date() }],
				IsTruncated: false
			});
		const result = await searchObjects(makeClient(), 'bucket', '', 'match');
		expect(result.objects).toHaveLength(1);
		expect(result.objects[0].key).toBe('b-match.txt');
		expect(mockSend).toHaveBeenCalledTimes(2);
	});

	it('returns totalFound count', async () => {
		mockSend.mockResolvedValueOnce({
			Contents: [
				{ Key: 'a.txt', Size: 1, LastModified: new Date() },
				{ Key: 'b.txt', Size: 1, LastModified: new Date() }
			],
			IsTruncated: false
		});
		const result = await searchObjects(makeClient(), 'bucket', '', 'a');
		expect(result.totalFound).toBe(2); // total scanned
		expect(result.objects).toHaveLength(1); // only 'a.txt' matches
	});

	it('extracts name from key correctly', async () => {
		mockSend.mockResolvedValueOnce({
			Contents: [
				{ Key: 'folder/sub/file.txt', Size: 100, LastModified: new Date(), ETag: '"abc123"' }
			],
			IsTruncated: false
		});
		const result = await searchObjects(makeClient(), 'bucket', '', 'file');
		expect(result.objects[0].name).toBe('file.txt');
		expect(result.objects[0].key).toBe('folder/sub/file.txt');
		expect(result.objects[0].isFolder).toBe(false);
		expect(result.objects[0].etag).toBe('abc123');
	});

	it('stops early when maxKeys matches found', async () => {
		mockSend.mockResolvedValueOnce({
			Contents: [
				{ Key: 'a.txt', Size: 1, LastModified: new Date() },
				{ Key: 'b.txt', Size: 1, LastModified: new Date() },
				{ Key: 'c.txt', Size: 1, LastModified: new Date() }
			],
			IsTruncated: true,
			NextContinuationToken: 'token1'
		});
		// maxKeys = 2, so should stop after finding 2 matches
		const result = await searchObjects(makeClient(), 'bucket', '', '.txt', 2);
		expect(result.objects).toHaveLength(2);
		// Should NOT have made a second call since we already have enough matches
		expect(mockSend).toHaveBeenCalledTimes(1);
	});

	it('handles empty results', async () => {
		mockSend.mockResolvedValueOnce({
			Contents: [],
			IsTruncated: false
		});
		const result = await searchObjects(makeClient(), 'bucket', '', 'nonexistent');
		expect(result.objects).toHaveLength(0);
		expect(result.totalFound).toBe(0);
	});
});

// ── Multipart Upload ────────────────────────────────────────────────────

describe('initiateMultipartUpload', () => {
	it('sends CreateMultipartUploadCommand with correct params', async () => {
		mockSend.mockResolvedValueOnce({ UploadId: 'upload-123' });
		const result = await initiateMultipartUpload(makeClient(), 'bucket', 'file.zip', 'application/zip');
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'CreateMultipartUpload',
				Bucket: 'bucket',
				Key: 'file.zip',
				ContentType: 'application/zip'
			})
		);
		expect(result.uploadId).toBe('upload-123');
	});

	it('uses default content type when not provided', async () => {
		mockSend.mockResolvedValueOnce({ UploadId: 'upload-456' });
		await initiateMultipartUpload(makeClient(), 'bucket', 'file.bin');
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'CreateMultipartUpload',
				ContentType: 'application/octet-stream'
			})
		);
	});
});

describe('getPresignedPartUrl', () => {
	it('generates presigned URL for a part', async () => {
		const url = await getPresignedPartUrl(makeClient(), 'bucket', 'file.zip', 'upload-123', 1);
		expect(url).toBe('https://mocked-presigned-url.example.com/test');
	});
});

describe('completeMultipartUpload', () => {
	it('sends CompleteMultipartUploadCommand with sorted parts', async () => {
		mockSend.mockResolvedValueOnce({});
		const parts = [
			{ PartNumber: 3, ETag: 'etag3' },
			{ PartNumber: 1, ETag: 'etag1' },
			{ PartNumber: 2, ETag: 'etag2' }
		];
		await completeMultipartUpload(makeClient(), 'bucket', 'file.zip', 'upload-123', parts);
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'CompleteMultipartUpload',
				Bucket: 'bucket',
				Key: 'file.zip',
				UploadId: 'upload-123',
				MultipartUpload: {
					Parts: [
						{ PartNumber: 1, ETag: 'etag1' },
						{ PartNumber: 2, ETag: 'etag2' },
						{ PartNumber: 3, ETag: 'etag3' }
					]
				}
			})
		);
	});
});

describe('abortMultipartUpload', () => {
	it('sends AbortMultipartUploadCommand', async () => {
		mockSend.mockResolvedValueOnce({});
		await abortMultipartUpload(makeClient(), 'bucket', 'file.zip', 'upload-123');
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				_type: 'AbortMultipartUpload',
				Bucket: 'bucket',
				Key: 'file.zip',
				UploadId: 'upload-123'
			})
		);
	});
});

describe('listUploadParts', () => {
	it('returns mapped parts list', async () => {
		mockSend.mockResolvedValueOnce({
			Parts: [
				{ PartNumber: 1, ETag: '"etag1"', Size: 1024 },
				{ PartNumber: 2, ETag: '"etag2"', Size: 512 }
			]
		});
		const parts = await listUploadParts(makeClient(), 'bucket', 'file.zip', 'upload-123');
		expect(parts).toEqual([
			{ PartNumber: 1, ETag: '"etag1"', Size: 1024 },
			{ PartNumber: 2, ETag: '"etag2"', Size: 512 }
		]);
	});

	it('returns empty array when no parts', async () => {
		mockSend.mockResolvedValueOnce({ Parts: undefined });
		const parts = await listUploadParts(makeClient(), 'bucket', 'file.zip', 'upload-123');
		expect(parts).toEqual([]);
	});
});

// ── P3.3: Bucket CORS ──────────────────────────────────────────────────

describe('getBucketCors', () => {
	it('returns mapped CORS rules', async () => {
		mockSend.mockResolvedValueOnce({
			CORSRules: [{
				ID: 'rule1',
				AllowedOrigins: ['http://example.com'],
				AllowedMethods: ['GET', 'PUT'],
				AllowedHeaders: ['*'],
				ExposeHeaders: ['ETag'],
				MaxAgeSeconds: 3600
			}]
		});
		const rules = await getBucketCors(makeClient(), 'bucket');
		expect(rules).toEqual([{
			id: 'rule1',
			allowedOrigins: ['http://example.com'],
			allowedMethods: ['GET', 'PUT'],
			allowedHeaders: ['*'],
			exposeHeaders: ['ETag'],
			maxAgeSeconds: 3600
		}]);
	});

	it('returns empty array when no CORS configured', async () => {
		mockSend.mockRejectedValueOnce({ name: 'NoSuchCORSConfiguration' });
		const rules = await getBucketCors(makeClient(), 'bucket');
		expect(rules).toEqual([]);
	});

	it('returns empty array when no CORS configured (Code variant)', async () => {
		mockSend.mockRejectedValueOnce({ Code: 'NoSuchCORSConfiguration' });
		const rules = await getBucketCors(makeClient(), 'bucket');
		expect(rules).toEqual([]);
	});

	it('throws on unexpected errors', async () => {
		mockSend.mockRejectedValueOnce(new Error('Access Denied'));
		await expect(getBucketCors(makeClient(), 'bucket')).rejects.toThrow('Access Denied');
	});

	it('returns empty array when CORSRules is undefined', async () => {
		mockSend.mockResolvedValueOnce({ CORSRules: undefined });
		const rules = await getBucketCors(makeClient(), 'bucket');
		expect(rules).toEqual([]);
	});
});

describe('setBucketCors', () => {
	it('sends PutBucketCorsCommand with correct params', async () => {
		mockSend.mockResolvedValueOnce({});
		await setBucketCors(makeClient(), 'bucket', [{
			allowedOrigins: ['*'],
			allowedMethods: ['GET'],
			allowedHeaders: ['*'],
			exposeHeaders: [],
			maxAgeSeconds: 3600
		}]);
		expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
			_type: 'PutBucketCors'
		}));
	});

	it('maps multiple rules correctly', async () => {
		mockSend.mockResolvedValueOnce({});
		await setBucketCors(makeClient(), 'bucket', [
			{
				id: 'rule1',
				allowedOrigins: ['http://localhost:5173'],
				allowedMethods: ['GET', 'HEAD'],
				allowedHeaders: ['*'],
				exposeHeaders: ['ETag'],
				maxAgeSeconds: 3600
			},
			{
				allowedOrigins: ['https://example.com'],
				allowedMethods: ['PUT', 'POST'],
				allowedHeaders: ['Content-Type'],
				exposeHeaders: [],
				maxAgeSeconds: 86400
			}
		]);
		const call = mockSend.mock.calls[0][0];
		expect(call.CORSConfiguration.CORSRules).toHaveLength(2);
		expect(call.CORSConfiguration.CORSRules[0].ID).toBe('rule1');
		expect(call.CORSConfiguration.CORSRules[1].AllowedOrigins).toEqual(['https://example.com']);
	});
});

describe('deleteBucketCors', () => {
	it('sends DeleteBucketCorsCommand', async () => {
		mockSend.mockResolvedValueOnce({});
		await deleteBucketCors(makeClient(), 'bucket');
		expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
			_type: 'DeleteBucketCors'
		}));
	});

	it('passes correct bucket name', async () => {
		mockSend.mockResolvedValueOnce({});
		await deleteBucketCors(makeClient(), 'my-bucket');
		const call = mockSend.mock.calls[0][0];
		expect(call.Bucket).toBe('my-bucket');
	});
});
