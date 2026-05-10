import { error, type RequestHandler } from '@sveltejs/kit';
import { isOIDCEnabled, buildAuthorizationUrl } from '$lib/server/oidc';
import * as client from 'openid-client';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!isOIDCEnabled()) {
		throw error(404, 'OIDC is not configured');
	}

	const state = client.randomState();
	const nonce = client.randomNonce();

	// Store state and nonce in a short-lived cookie for validation on callback
	cookies.set('oidc_state', JSON.stringify({ state, nonce }), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 300 // 5 minutes
	});

	const authUrl = await buildAuthorizationUrl(state, nonce);

	return new Response(null, {
		status: 302,
		headers: { Location: authUrl }
	});
};
