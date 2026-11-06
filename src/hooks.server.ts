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
		publicEndpoint: process.env.S3_PUBLIC_ENDPOINT || undefined,
		...(process.env.S3_SESSION_TOKEN && { sessionToken: process.env.S3_SESSION_TOKEN })
	};
}

/**
 * Returns the single allowed bucket name when single-bucket mode is active
 * (S3_BUCKET env var is set). In this mode the app skips ListBuckets and
 * scopes all operations to this one bucket — required for IAM users that
 * lack s3:ListAllMyBuckets permission.
 */
export function getSingleBucket(): string | null {
	const name = process.env.S3_BUCKET?.trim();
	return name ? name : null;
}

const STATIC_SECURITY_HEADERS: Record<string, string> = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-XSS-Protection': '1; mode=block'
};

function toOrigin(endpoint: string): string {
	// Extract just the origin (protocol + host + port) from the endpoint URL
	// to ensure CSP matches all paths on the S3 server
	try {
		return new URL(endpoint).origin;
	} catch {
		// If URL parsing fails, strip trailing slashes and use as-is
		return endpoint.replace(/\/+$/, '');
	}
}

function buildCSP(s3Endpoints: string[] = []): string {
	const origins = [...new Set(s3Endpoints.filter(Boolean).map(toOrigin))].join(' ');
	const connectSrc = origins ? `connect-src 'self' ${origins}` : "connect-src 'self'";
	const imgSrc = origins
		? `img-src 'self' data: blob: ${origins}`
		: "img-src 'self' data: blob:";
	return `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ${imgSrc}; ${connectSrc}; font-src 'self' https://fonts.gstatic.com`;
}

function addSecurityHeaders(response: Response, s3Endpoints: string[]): Response {
	for (const [key, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
		response.headers.set(key, value);
	}
	response.headers.set('Content-Security-Policy', buildCSP(s3Endpoints));
	return response;
}

/**
 * Resolve the S3 endpoints the browser may talk to (for CSP) from environment
 * variables or session credentials: the regular endpoint plus, when set, the
 * public endpoint that presigned URLs are signed against.
 */
function resolveS3Endpoints(credentials?: S3Credentials | null): string[] {
	const endpoint =
		process.env.S3_ENDPOINT || process.env.S3_DEFAULT_ENDPOINT || credentials?.endpoint;
	const publicEndpoint =
		process.env.S3_PUBLIC_ENDPOINT ||
		credentials?.publicEndpoint ||
		process.env.S3_DEFAULT_PUBLIC_ENDPOINT;
	return [endpoint, publicEndpoint].filter((e): e is string => !!e);
}

export const handle: Handle = async ({ event, resolve }) => {
	// --- Health check endpoint — bypass auth and security headers ---
	if (event.url.pathname === '/health') {
		return resolve(event);
	}

	const fixedCreds = getFixedCredentials();
	const singleBucket = getSingleBucket();
	if (singleBucket) {
		event.locals.singleBucket = singleBucket;
	}

	// --- Enforce single-bucket scope on every S3 API call ---
	// Prevents a curious user from probing other buckets via ?bucket=... params
	// or JSON body fields once the operator has restricted the app to one bucket.
	if (singleBucket && event.url.pathname.startsWith('/api/s3')) {
		// Query-string check (covers GET ?bucket=...)
		const requestedBucket = event.url.searchParams.get('bucket');
		if (requestedBucket && requestedBucket !== singleBucket) {
			return new Response(
				JSON.stringify({ error: `Access denied — app is restricted to bucket "${singleBucket}"` }),
				{ status: 403, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// JSON body check (covers POST/PUT/DELETE with { bucket: "..." })
		// Reading the body consumes the stream, so we re-wrap the request
		// with the parsed text so downstream handlers can read it again.
		const method = event.request.method;
		const contentType = event.request.headers.get('content-type') || '';
		if (
			(method === 'POST' || method === 'PUT' || method === 'DELETE') &&
			contentType.includes('application/json')
		) {
			try {
				const bodyText = await event.request.text();
				if (bodyText) {
					try {
						const parsed = JSON.parse(bodyText);
						if (
							parsed &&
							typeof parsed.bucket === 'string' &&
							parsed.bucket !== singleBucket
						) {
							return new Response(
								JSON.stringify({
									error: `Access denied — app is restricted to bucket "${singleBucket}"`
								}),
								{ status: 403, headers: { 'Content-Type': 'application/json' } }
							);
						}
					} catch {
						// Not JSON we recognise — fall through and let the handler decide.
					}
				}
				// Re-attach a fresh Request so downstream handlers can read the body.
				event.request = new Request(event.request.url, {
					method: event.request.method,
					headers: event.request.headers,
					body: bodyText || null
				});
			} catch {
				// If we can't read the body for any reason, fall through.
			}
		}
	}

	// --- Fixed credentials mode ---
	// When env vars are set, always use them for ALL routes.
	// The session cookie is irrelevant in this mode (unless OIDC gates access).
	if (fixedCreds && !isOIDCEnabled()) {
		event.locals.credentials = fixedCreds;
		const response = await resolve(event);
		return addSecurityHeaders(response, resolveS3Endpoints(fixedCreds));
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
			return addSecurityHeaders(response, resolveS3Endpoints(fixedCreds));
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
		return addSecurityHeaders(response, resolveS3Endpoints(fixedCreds));
	}

	// --- OIDC mode (without fixed creds) ---
	if (isOIDCEnabled()) {
		// Always allow auth endpoints and root page
		if (event.url.pathname === '/' || event.url.pathname.startsWith('/api/auth')) {
			const response = await resolve(event);
			return addSecurityHeaders(response, resolveS3Endpoints(event.locals.credentials));
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
		return addSecurityHeaders(response, resolveS3Endpoints(event.locals.credentials));
	}

	// --- Manual mode (default) ---
	// Always allow auth endpoints and the root page (login)
	if (event.url.pathname === '/' || event.url.pathname.startsWith('/api/auth')) {
		const response = await resolve(event);
		return addSecurityHeaders(response, resolveS3Endpoints(event.locals.credentials));
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
	return addSecurityHeaders(response, resolveS3Endpoints(event.locals.credentials));
};
