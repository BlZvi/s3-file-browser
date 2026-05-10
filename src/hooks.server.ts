import type { Handle } from '@sveltejs/kit';
import type { S3Credentials } from '$lib/types';
import { decryptSession } from '$lib/server/session';
import { isOIDCEnabled } from '$lib/server/oidc';

/**
 * Check whether fixed credentials mode is active.
 * When S3_ACCESS_KEY and S3_SECRET_KEY env vars are both set,
 * the app skips the login form and uses server-side credentials.
 */
export function getFixedCredentials(): S3Credentials | null {
	const accessKeyId = process.env.S3_ACCESS_KEY;
	const secretAccessKey = process.env.S3_SECRET_KEY;

	if (!accessKeyId || !secretAccessKey) {
		return null;
	}

	return {
		accessKeyId,
		secretAccessKey,
		region: process.env.S3_REGION || 'us-east-1',
		endpoint: process.env.S3_ENDPOINT || undefined,
		...(process.env.S3_SESSION_TOKEN && { sessionToken: process.env.S3_SESSION_TOKEN })
	};
}

const STATIC_SECURITY_HEADERS: Record<string, string> = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-XSS-Protection': '1; mode=block'
};

function buildCSP(s3Endpoint?: string): string {
	// Extract just the origin (protocol + host + port) from the endpoint URL
	// to ensure CSP matches all paths on the S3 server
	let origin = '';
	if (s3Endpoint) {
		try {
			const parsed = new URL(s3Endpoint);
			origin = parsed.origin;
		} catch {
			// If URL parsing fails, strip trailing slashes and use as-is
			origin = s3Endpoint.replace(/\/+$/, '');
		}
	}
	const connectSrc = origin ? `connect-src 'self' ${origin}` : "connect-src 'self'";
	const imgSrc = origin
		? `img-src 'self' data: blob: ${origin}`
		: "img-src 'self' data: blob:";
	return `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ${imgSrc}; ${connectSrc}; font-src 'self' https://fonts.gstatic.com`;
}

function addSecurityHeaders(response: Response, s3Endpoint?: string): Response {
	for (const [key, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
		response.headers.set(key, value);
	}
	response.headers.set('Content-Security-Policy', buildCSP(s3Endpoint));
	return response;
}

/**
 * Resolve the S3 endpoint from environment variables or session credentials.
 */
function resolveS3Endpoint(credentials?: S3Credentials | null): string | undefined {
	return process.env.S3_ENDPOINT || process.env.S3_DEFAULT_ENDPOINT || credentials?.endpoint || undefined;
}

export const handle: Handle = async ({ event, resolve }) => {
	// --- Health check endpoint — bypass auth and security headers ---
	if (event.url.pathname === '/health') {
		return resolve(event);
	}

	const fixedCreds = getFixedCredentials();

	// --- Fixed credentials mode ---
	// When env vars are set, always use them for ALL routes.
	// The session cookie is irrelevant in this mode (unless OIDC gates access).
	if (fixedCreds && !isOIDCEnabled()) {
		event.locals.credentials = fixedCreds;
		const response = await resolve(event);
		return addSecurityHeaders(response, resolveS3Endpoint(fixedCreds));
	}

	// --- Session decryption helper ---
	const sessionCookie = event.cookies.get('s3session');
	let sessionPayload: ReturnType<typeof decryptSession> | null = null;

	if (sessionCookie) {
		try {
			sessionPayload = decryptSession(sessionCookie);
			if (sessionPayload.credentials) {
				event.locals.credentials = sessionPayload.credentials;
			}
			if (sessionPayload.user) {
				event.locals.user = sessionPayload.user;
			}
		} catch {
			// Invalid session, clear it
			event.cookies.delete('s3session', { path: '/' });
		}
	}

	// --- Fixed creds + OIDC mode ---
	// OIDC gates access, but fixed creds provide S3 credentials once authenticated.
	if (fixedCreds && isOIDCEnabled()) {
		// Always allow auth endpoints and root page
		if (event.url.pathname === '/' || event.url.pathname.startsWith('/api/auth')) {
			const response = await resolve(event);
			return addSecurityHeaders(response, resolveS3Endpoint(fixedCreds));
		}

		// Protected routes require OIDC authentication
		if (event.url.pathname.startsWith('/api/s3') || event.url.pathname.startsWith('/browse')) {
			if (!event.locals.user) {
				if (event.url.pathname.startsWith('/api/')) {
					return new Response(JSON.stringify({ error: 'Unauthorized' }), {
						status: 401,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				return new Response(null, {
					status: 302,
					headers: { Location: '/api/auth/oidc/login' }
				});
			}
			// User is OIDC-authenticated; inject fixed creds
			event.locals.credentials = fixedCreds;
		}

		const response = await resolve(event);
		return addSecurityHeaders(response, resolveS3Endpoint(fixedCreds));
	}

	// --- OIDC mode (without fixed creds) ---
	if (isOIDCEnabled()) {
		// Always allow auth endpoints and root page
		if (event.url.pathname === '/' || event.url.pathname.startsWith('/api/auth')) {
			const response = await resolve(event);
			return addSecurityHeaders(response, resolveS3Endpoint(event.locals.credentials));
		}

		// Protected routes
		if (event.url.pathname.startsWith('/api/s3') || event.url.pathname.startsWith('/browse')) {
			// No session at all → redirect to OIDC login
			if (!event.locals.user && !event.locals.credentials) {
				if (event.url.pathname.startsWith('/api/')) {
					return new Response(JSON.stringify({ error: 'Unauthorized' }), {
						status: 401,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				return new Response(null, {
					status: 302,
					headers: { Location: '/api/auth/oidc/login' }
				});
			}

			// OIDC-authenticated but no S3 credentials yet → redirect to login page
			// to enter S3 creds manually
			if (event.locals.user && !event.locals.credentials) {
				if (event.url.pathname.startsWith('/api/')) {
					return new Response(
						JSON.stringify({ error: 'S3 credentials required' }),
						{ status: 401, headers: { 'Content-Type': 'application/json' } }
					);
				}
				return new Response(null, {
					status: 302,
					headers: { Location: '/' }
				});
			}
		}

		const response = await resolve(event);
		return addSecurityHeaders(response, resolveS3Endpoint(event.locals.credentials));
	}

	// --- Manual mode (default) ---
	// Always allow auth endpoints and the root page (login)
	if (event.url.pathname === '/' || event.url.pathname.startsWith('/api/auth')) {
		const response = await resolve(event);
		return addSecurityHeaders(response, resolveS3Endpoint(event.locals.credentials));
	}

	// Protect all /api/s3/* and /browse/* routes
	if (event.url.pathname.startsWith('/api/s3') || event.url.pathname.startsWith('/browse')) {
		if (!event.locals.credentials) {
			if (event.url.pathname.startsWith('/api/')) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			// Redirect to login for page routes
			return new Response(null, {
				status: 302,
				headers: { Location: '/' }
			});
		}
	}

	const response = await resolve(event);
	return addSecurityHeaders(response, resolveS3Endpoint(event.locals.credentials));
};
