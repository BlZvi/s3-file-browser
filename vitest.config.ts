import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		// Ensure Svelte resolves to the browser/client build in jsdom tests
		conditions: ['browser']
	},
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node',
		globals: true,
		setupFiles: ['src/lib/components/test-setup.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.ts'],
			exclude: ['src/lib/types.ts', 'src/lib/index.ts'],
			reporter: ['text', 'html', 'lcov']
		}
	}
});
