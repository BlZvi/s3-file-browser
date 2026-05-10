import { error, type RequestHandler } from '@sveltejs/kit';
import {
	isOIDCEnabled,
	exchangeCodeForTokens,
	extractUserIdentity,
	getOIDCConfig
} from '$lib/server/oidc';
import { encryptSession } from '$lib/server/session';
import { getFixedCredentials } from '../../../../../hooks.server';

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!isOIDCEnabled()) {
		throw error(404, 'OIDC is not configured');
	}

	// Read and validate state cookie
	const stateCookie = cookies.get('oidc_state');
	if (!stateCookie) {
		throw error(400, 'Missing OIDC state cookie — session may have expired');
	}

	let storedState: string;
	let storedNonce: string;
	try {
		const parsed = JSON.parse(stateCookie);
		storedState = parsed.state;
		storedNonce = parsed.nonce;
	} catch {
		throw error(400, 'Invalid OIDC state cookie');
	}

	// Clear the state cookie immediately
	cookies.delete('oidc_state', { path: '/' });

	// Validate state parameter
	const stateParam = url.searchParams.get('state');
	if (!stateParam || stateParam !== storedState) {
		throw error(400, 'Invalid state parameter — possible CSRF attack');
	}

	// Check for error response from IdP
	const errorParam = url.searchParams.get('error');
	if (errorParam) {
		const errorDesc = url.searchParams.get('error_description') || errorParam;
		throw error(400, `OIDC authentication failed: ${errorDesc}`);
	}

	// Exchange code for tokens
	try {
		const oidcConfig = getOIDCConfig()!;

		// Build the full callback URL as the OIDC client expects it
		const callbackUrl = new URL(url.pathname + url.search, oidcConfig.redirectUri);

		const tokens = await exchangeCodeForTokens(
			callbackUrl,
			storedState,
			storedNonce
		);

		// Extract user identity from ID token claims
		const claims = tokens.claims();
		if (!claims) {
			throw error(500, 'No ID token received from OIDC provider');
		}

		const identity = extractUserIdentity(claims as Record<string, unknown>);

		// Build session payload
		const fixedCreds = getFixedCredentials();
		const hasFixedCreds = fixedCreds !== null;

		const sessionPayload = hasFixedCreds
			? { credentials: fixedCreds, user: identity }
			: { user: identity };

		// Encrypt and set session cookie
		const encrypted = encryptSession(sessionPayload);
		cookies.set('s3session', encrypted, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 8 // 8 hours
		});

		// Redirect based on whether S3 credentials are available
		const redirectTo = hasFixedCreds ? '/browse' : '/';

		return new Response(null, {
			status: 302,
			headers: { Location: redirectTo }
		});
	} catch (err: any) {
		console.error('OIDC callback error:', err);

		// Re-throw SvelteKit errors
		if (err.status) {
			throw err;
		}

		throw error(500, 'OIDC authentication failed');
	}
};
