import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encryptSession, decryptSession } from './session';
import type { S3Credentials } from '$lib/types';
import type { SessionPayload } from './session';

describe('session encryption', () => {
	const validCredentials: S3Credentials = {
		accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
		secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		region: 'us-east-1',
		endpoint: 'http://localhost:9000'
	};

	const validPayload: SessionPayload = {
		credentials: validCredentials
	};

	it('encrypts and decrypts credentials round-trip', () => {
		const encrypted = encryptSession(validPayload);
		const decrypted = decryptSession(encrypted);

		expect(decrypted).toEqual(validPayload);
	});

	it('produces different ciphertexts for the same input (random IV)', () => {
		const encrypted1 = encryptSession(validPayload);
		const encrypted2 = encryptSession(validPayload);

		expect(encrypted1).not.toBe(encrypted2);
	});

	it('decrypts back to identical payload each time', () => {
		const encrypted1 = encryptSession(validPayload);
		const encrypted2 = encryptSession(validPayload);

		expect(decryptSession(encrypted1)).toEqual(decryptSession(encrypted2));
	});

	it('encrypted string has iv:tag:data format', () => {
		const encrypted = encryptSession(validPayload);
		const parts = encrypted.split(':');

		expect(parts).toHaveLength(3);
		// IV is 16 bytes = 32 hex chars
		expect(parts[0]).toHaveLength(32);
		// Auth tag is 16 bytes = 32 hex chars
		expect(parts[1]).toHaveLength(32);
		// Encrypted data is non-empty
		expect(parts[2].length).toBeGreaterThan(0);
	});

	it('throws on tampered ciphertext', () => {
		const encrypted = encryptSession(validPayload);
		const parts = encrypted.split(':');
		// Tamper with the encrypted data
		const tampered = `${parts[0]}:${parts[1]}:${'ff'.repeat(parts[2].length / 2)}`;

		expect(() => decryptSession(tampered)).toThrow();
	});

	it('throws on invalid session format (missing parts)', () => {
		expect(() => decryptSession('invalid')).toThrow('Invalid session format');
		expect(() => decryptSession('part1:part2')).toThrow('Invalid session format');
		expect(() => decryptSession('')).toThrow('Invalid session format');
	});

	it('throws on invalid session format (too many parts)', () => {
		expect(() => decryptSession('a:b:c:d')).toThrow('Invalid session format');
	});

	it('handles credentials without optional endpoint', () => {
		const creds: S3Credentials = {
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
			region: 'eu-west-1'
		};

		const encrypted = encryptSession({ credentials: creds });
		const decrypted = decryptSession(encrypted);

		expect(decrypted.credentials).toEqual(creds);
		expect(decrypted.credentials?.endpoint).toBeUndefined();
	});

	it('handles credentials with special characters', () => {
		const creds: S3Credentials = {
			accessKeyId: 'key-with-special/chars+test=',
			secretAccessKey: 'secret/with+special=chars&more!@#$%',
			region: 'ap-northeast-1',
			endpoint: 'https://s3.例え.jp:9000/path?query=1'
		};

		const encrypted = encryptSession({ credentials: creds });
		const decrypted = decryptSession(encrypted);

		expect(decrypted.credentials).toEqual(creds);
	});

	it('handles credentials with unicode characters', () => {
		const creds: S3Credentials = {
			accessKeyId: 'キー',
			secretAccessKey: '秘密鍵',
			region: 'us-east-1',
			endpoint: 'http://名前.example.com:9000'
		};

		const encrypted = encryptSession({ credentials: creds });
		const decrypted = decryptSession(encrypted);

		expect(decrypted.credentials).toEqual(creds);
	});

	it('handles credentials with very long endpoint URL', () => {
		const creds: S3Credentials = {
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
			region: 'us-east-1',
			endpoint: `http://${'a'.repeat(500)}.example.com:9000`
		};

		const encrypted = encryptSession({ credentials: creds });
		const decrypted = decryptSession(encrypted);

		expect(decrypted.credentials).toEqual(creds);
	});

	it('handles empty string values in credentials', () => {
		const creds: S3Credentials = {
			accessKeyId: '',
			secretAccessKey: '',
			region: '',
			endpoint: ''
		};

		const encrypted = encryptSession({ credentials: creds });
		const decrypted = decryptSession(encrypted);

		expect(decrypted.credentials).toEqual(creds);
	});

	describe('SESSION_SECRET environment variable', () => {
		const originalEnv = process.env.SESSION_SECRET;

		afterEach(() => {
			if (originalEnv !== undefined) {
				process.env.SESSION_SECRET = originalEnv;
			} else {
				delete process.env.SESSION_SECRET;
			}
		});

		it('different SESSION_SECRET produces incompatible encryption', async () => {
			// Encrypt with default secret
			delete process.env.SESSION_SECRET;

			const encrypted = encryptSession(validPayload);

			// Change the secret
			process.env.SESSION_SECRET = 'completely-different-secret-key-12345';

			expect(() => decryptSession(encrypted)).toThrow();
		});
	});

	describe('backward compatibility with old session format', () => {
		it('wraps old-format session (top-level accessKeyId) as { credentials: ... }', () => {
			// Simulate an old-format session by encrypting raw S3Credentials
			// (as the old code would have done)
			const crypto = require('node:crypto');
			const secret = process.env.SESSION_SECRET || 'default-dev-secret-change-in-prod!!';
			const key = crypto.createHash('sha256').update(secret).digest();
			const iv = crypto.randomBytes(16);
			const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

			const oldPayload = JSON.stringify(validCredentials); // raw S3Credentials
			let encrypted = cipher.update(oldPayload, 'utf8', 'hex');
			encrypted += cipher.final('hex');
			const tag = cipher.getAuthTag();

			const sessionValue = `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;

			// decryptSession should detect the old format and wrap it
			const result = decryptSession(sessionValue);
			expect(result.credentials).toEqual(validCredentials);
			expect(result.user).toBeUndefined();
		});
	});

	describe('new session payload with user identity', () => {
		it('encrypts and decrypts payload with user only', () => {
			const payload: SessionPayload = {
				user: {
					email: 'user@example.com',
					name: 'Test User',
					groups: ['admin', 'users'],
					provider: 'oidc'
				}
			};

			const encrypted = encryptSession(payload);
			const decrypted = decryptSession(encrypted);

			expect(decrypted).toEqual(payload);
			expect(decrypted.user?.email).toBe('user@example.com');
			expect(decrypted.credentials).toBeUndefined();
		});

		it('encrypts and decrypts payload with both credentials and user', () => {
			const payload: SessionPayload = {
				credentials: validCredentials,
				user: {
					email: 'admin@corp.com',
					name: 'Admin',
					provider: 'oidc'
				}
			};

			const encrypted = encryptSession(payload);
			const decrypted = decryptSession(encrypted);

			expect(decrypted).toEqual(payload);
			expect(decrypted.credentials).toEqual(validCredentials);
			expect(decrypted.user?.email).toBe('admin@corp.com');
		});

		it('encrypts and decrypts payload with credentials only (new format)', () => {
			const payload: SessionPayload = {
				credentials: validCredentials
			};

			const encrypted = encryptSession(payload);
			const decrypted = decryptSession(encrypted);

			expect(decrypted).toEqual(payload);
			expect(decrypted.credentials).toEqual(validCredentials);
			expect(decrypted.user).toBeUndefined();
		});
	});
});
