import type { S3Credentials, UserIdentity } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			credentials?: S3Credentials;
			user?: UserIdentity;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
