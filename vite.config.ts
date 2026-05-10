import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

/**
 * Workaround for flowbite-svelte Arrow.svelte CSS incompatibility with Tailwind CSS v4.
 * The Arrow.svelte component's <style> block triggers a CssSyntaxError ("Invalid declaration: `Side`")
 * when processed by @tailwindcss/vite. This plugin intercepts the virtual CSS module at the load stage
 * and rewrites the problematic CSS to be valid, preventing the Tailwind CSS parser from choking.
 */
function flowbiteArrowCssFix(): Plugin {
	return {
		name: 'flowbite-arrow-css-fix',
		enforce: 'pre',
		load(id) {
			if (id.includes('Arrow.svelte') && id.includes('lang.css')) {
				// Return valid CSS that replaces the problematic Arrow.svelte styles
				return `.clip { clip-path: polygon(0 0, 0% 100%, 100% 100%, 100% 85%, 15% 0); }`;
			}
		}
	};
}

export default defineConfig({
	plugins: [flowbiteArrowCssFix(), tailwindcss(), sveltekit()]
});
