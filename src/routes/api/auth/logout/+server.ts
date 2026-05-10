import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	// In fixed credentials mode, there's no user session to clear
	if (process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY) {
		return json(
			{ error: 'Logout not available in fixed credentials mode' },
			{ status: 400 }
		);
	}

	cookies.delete('s3session', { path: '/' });
	return json({ success: true });
};
