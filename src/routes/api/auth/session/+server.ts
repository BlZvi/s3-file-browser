import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isOIDCEnabled } from '$lib/server/oidc';

export const GET: RequestHandler = async ({ locals }) => {
	const defaultEndpoint = process.env.S3_DEFAULT_ENDPOINT || '';
	const defaultRegion = process.env.S3_DEFAULT_REGION || '';

	// Determine auth mode based on env vars
	const isFixedMode = !!(process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
	const oidcEnabled = isOIDCEnabled();

	// Mode priority:
	// - "fixed" when fixed creds are set WITHOUT OIDC (pure fixed mode, no login needed)
	// - "oidc" when OIDC is configured (even if fixed creds are also set, OIDC gates access)
	// - "manual" otherwise
	let mode: 'fixed' | 'oidc' | 'manual';
	if (oidcEnabled) {
		mode = 'oidc';
	} else if (isFixedMode) {
		mode = 'fixed';
	} else {
		mode = 'manual';
	}

	// In pure fixed mode (no OIDC), credentials are always available
	if (mode === 'fixed') {
		return json({
			valid: true,
			mode,
			region: locals.credentials?.region,
			endpoint: locals.credentials?.endpoint,
			defaultEndpoint,
			defaultRegion
		});
	}

	// Build response with user info if available
	const user = locals.user
		? { email: locals.user.email, name: locals.user.name }
		: undefined;

	// Valid session = has S3 credentials (either from fixed creds or manual entry)
	const valid = !!locals.credentials;

	if (!valid && !locals.user) {
		// No session at all
		return json(
			{
				valid: false,
				mode,
				oidcEnabled,
				defaultEndpoint,
				defaultRegion
			},
			{ status: 401 }
		);
	}

	return json({
		valid,
		mode,
		oidcEnabled,
		user,
		region: locals.credentials?.region,
		endpoint: locals.credentials?.endpoint,
		defaultEndpoint,
		defaultRegion
	});
};
