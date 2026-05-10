export interface S3Credentials {
	accessKeyId: string;
	secretAccessKey: string;
	region: string;
	endpoint?: string; // Optional: for MinIO, DigitalOcean Spaces, etc.
	sessionToken?: string; // Optional: for STS temporary credentials
}

export interface S3Object {
	key: string;
	name: string;
	size: number;
	lastModified: string;
	isFolder: boolean;
	etag?: string;
}

export interface BucketInfo {
	name: string;
	creationDate?: string;
}

export interface BrowseResult {
	objects: S3Object[];
	folders: string[];
	prefix: string;
	bucket: string;
	continuationToken?: string;
	isTruncated: boolean;
}

export interface ObjectMetadata {
	key: string;
	bucket: string;
	size: number;
	lastModified: string;
	contentType: string;
	etag: string;
	storageClass?: string;
	versionId?: string;
	metadata: Record<string, string>;
}

export interface FolderNode {
	/** The full prefix path (e.g. "photos/2024/") */
	prefix: string;
	/** Display name (last segment without trailing slash) */
	name: string;
	/** Whether this node has been expanded and children loaded */
	loaded: boolean;
	/** Whether this node is currently expanded in the UI */
	expanded: boolean;
	/** Whether children are currently being fetched */
	loading: boolean;
	/** Child folder nodes */
	children: FolderNode[];
}

export interface BucketDetails {
	name: string;
	versioning: 'Enabled' | 'Suspended' | 'Disabled';
	objectLocking: boolean;
	tags: Record<string, string>;
}

export interface UserIdentity {
	email: string;
	name?: string;
	groups?: string[];
	provider: 'oidc' | 'local';
}

export interface ObjectVersion {
	key: string;
	versionId: string;
	isLatest: boolean;
	lastModified: string;
	size: number;
	etag?: string;
	isDeleteMarker: boolean;
	storageClass?: string;
}

export interface CorsRule {
	id?: string;
	allowedOrigins: string[];
	allowedMethods: string[];
	allowedHeaders: string[];
	exposeHeaders: string[];
	maxAgeSeconds?: number;
}
