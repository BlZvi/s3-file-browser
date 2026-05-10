/** MinIO test environment constants */
export const MINIO = {
	endpoint: 'http://localhost:9000',
	accessKeyId: 'minioadmin',
	secretAccessKey: 'minioadmin',
	region: 'us-east-1'
} as const;

export const BUCKETS = {
	test: 'test-bucket',
	bulk: 'bulk-bucket',
	types: 'types-bucket',
	empty: 'empty-bucket',
	versioned: 'versioned-bucket'
} as const;

/** Expected seed data in test-bucket */
export const TEST_BUCKET_FILES = {
	root: ['hello.txt', 'test.json'],
	folders: ['documents/', 'images/'],
	documentsFiles: ['readme.txt'],
	documentsFolders: ['config/']
} as const;

/**
 * Bulk bucket structure: 5 levels deep
 * 10 x 5 x 5 x 4 x 10 files = 10,000 objects
 */
export const BULK_BUCKET = {
	totalDepth: 5,
	level1Count: 10,
	level2Count: 5,
	level3Count: 5,
	level4Count: 4,
	filesPerLeaf: 10,
	totalObjects: 10_000
} as const;

/** Types bucket: diverse file types and sizes */
export const TYPES_BUCKET = {
	categories: [
		'text',
		'json',
		'images',
		'documents',
		'binary',
		'code',
		'special-names',
		'large-files'
	],
	specialNames: [
		'file with spaces.txt',
		'file+plus.txt',
		'file%percent.txt',
		'UPPERCASE.TXT',
		'.hidden-file',
		'no-extension'
	]
} as const;

/** Versioned bucket: versioning enabled with multiple versions */
export const VERSIONED_BUCKET = {
	versionedFile: 'versioned-file.txt',
	deletedFile: 'deleted-file.txt',
	expectedVersionCount: 3 // 3 versions of versioned-file.txt
} as const;
