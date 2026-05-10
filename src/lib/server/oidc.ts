import * as client from 'openid-client';
import type { UserIdentity } from '$lib/types';

export interface OIDCConfig {
	issuer: string;
	clientId: string;
	clientSecret: string;
	scopes: string;
	redirectUri: string;
}

/**
 * Read OIDC configuration from environment variables.
 * Returns null if any required variable is missing.
 */
export function getOIDCConfig(): OIDCConfig | null {
	const issuer = process.env.OIDC_ISSUER;
	const clientId = process.env.OIDC_CLIENT_ID;
	const clientSecret = process.env.OIDC_CLIENT_SECRET;

	if (!issuer || !clientId || !clientSecret) {
		return null;
	}

	const origin = process.env.ORIGIN || 'http://localhost:3000';
	const scopes = process.env.OIDC_SCOPES || 'openid profile email';
	const redirectUri = `${origin}/api/auth/oidc/callback`;

	return { issuer, clientId, clientSecret, scopes, redirectUri };
}

/**
 * Returns true if OIDC is configured (all required env vars are set).
 */
export function isOIDCEnabled(): boolean {
	return getOIDCConfig() !== null;
}

/** Cached OIDC Configuration instance */
let cachedConfig: client.Configuration | null = null;
let cachedIssuer: string | null = null;

/**
 * Discover the OIDC provider and return a configured client.Configuration.
 * Caches the result so discovery only happens once per issuer.
 */
export async function discoverOIDCProvider(): Promise<client.Configuration> {
	const oidcConfig = getOIDCConfig();
	if (!oidcConfig) {
		throw new Error('OIDC is not configured');
	}

	// Return cached config if issuer hasn't changed
	if (cachedConfig && cachedIssuer === oidcConfig.issuer) {
		return cachedConfig;
	}

	const issuerUrl = new URL(oidcConfig.issuer);

	const config = await client.discovery(
		issuerUrl,
		oidcConfig.clientId,
		oidcConfig.clientSecret
	);

	cachedConfig = config;
	cachedIssuer = oidcConfig.issuer;

	return config;
}

/**
 * Build the OIDC authorization URL for the authorization code flow.
 */
export async function buildAuthorizationUrl(
	state: string,
	nonce: string
): Promise<string> {
	const oidcConfig = getOIDCConfig();
	if (!oidcConfig) {
		throw new Error('OIDC is not configured');
	}

	const config = await discoverOIDCProvider();

	const parameters: Record<string, string> = {
		redirect_uri: oidcConfig.redirectUri,
		scope: oidcConfig.scopes,
		state,
		nonce,
		response_type: 'code'
	};

	const url = client.buildAuthorizationUrl(config, parameters);
	return url.toString();
}

/**
 * Exchange an authorization code for tokens.
 * Returns the token endpoint response with helpers for extracting claims.
 */
export async function exchangeCodeForTokens(
	callbackUrl: URL,
	expectedState: string,
	expectedNonce: string
) {
	const config = await discoverOIDCProvider();

	const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
		expectedState,
		expectedNonce
	});

	return tokens;
}

/**
 * Extract user identity from ID token claims.
 */
export function extractUserIdentity(
	claims: Record<string, unknown>
): UserIdentity {
	const email =
		(claims.email as string) ||
		(claims.preferred_username as string) ||
		(claims.sub as string) ||
		'unknown';

	const name =
		(claims.name as string) ||
		[claims.given_name, claims.family_name].filter(Boolean).join(' ') ||
		undefined;

	// Groups can come from various claims depending on the IdP
	const rawGroups =
		(claims.groups as string[]) ||
		(claims['cognito:groups'] as string[]) ||
		undefined;

	return {
		email,
		name: name || undefined,
		groups: Array.isArray(rawGroups) ? rawGroups : undefined,
		provider: 'oidc'
	};
}
