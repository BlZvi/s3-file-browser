/**
 * Setup file for component tests running in jsdom environment.
 * Provides browser API mocks that jsdom doesn't implement.
 */

// Only apply browser mocks when running in a browser-like environment (jsdom)
if (typeof window !== 'undefined') {
	// Mock window.matchMedia — required by Flowbite Svelte components
	// that use Svelte's MediaQuery internally (e.g., NavUl)
	if (!window.matchMedia) {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: (query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: () => {},
				removeListener: () => {},
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false,
			}),
		});
	}
}
