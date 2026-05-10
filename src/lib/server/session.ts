import crypto from 'node:crypto';
import type { S3Credentials, UserIdentity } from '$lib/types';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

export interface SessionPayload {
	credentials?: S3Credentials;
	user?: UserIdentity;
}

const DEFAULT_SECRETS = ['default-dev-secret-change-in-prod!!', 'change-me-in-production'];

function getSecretKey(): Buffer {
	const secret = process.env.SESSION_SECRET || 'default-dev-secret-change-in-prod!!';

	if (process.env.NODE_ENV === 'production' && DEFAULT_SECRETS.includes(secret)) {
		throw new Error(
			'FATAL: SESSION_SECRET must be changed from the default value in production. Set the SESSION_SECRET environment variable.'
		);
	}

	// Derive a 32-byte key from the secret
	return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSession(payload: SessionPayload): string {
	const key = getSecretKey();
	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

	const plaintext = JSON.stringify(payload);
	let encrypted = cipher.update(plaintext, 'utf8', 'hex');
	encrypted += cipher.final('hex');

	const tag = cipher.getAuthTag();

	// Format: iv:tag:encrypted (all hex)
	return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decryptSession(sessionValue: string): SessionPayload {
	const key = getSecretKey();
	const parts = sessionValue.split(':');

	if (parts.length !== 3) {
		throw new Error('Invalid session format');
	}

	const iv = Buffer.from(parts[0], 'hex');
	const tag = Buffer.from(parts[1], 'hex');
	const encrypted = parts[2];

	const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(tag);

	let decrypted = decipher.update(encrypted, 'hex', 'utf8');
	decrypted += decipher.final('utf8');

	const parsed = JSON.parse(decrypted);

	// Backward compatibility: if the decrypted JSON has accessKeyId at the
	// top level (old format from Priority 1/2), wrap it as { credentials: ... }
	if (parsed.accessKeyId) {
		return { credentials: parsed as S3Credentials };
	}

	return parsed as SessionPayload;
}
