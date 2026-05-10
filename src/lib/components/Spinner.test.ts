// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Spinner from './Spinner.svelte';

describe('Spinner', () => {
	it('renders an SVG element', () => {
		const { container } = render(Spinner);
		const svg = container.querySelector('svg');
		expect(svg).toBeTruthy();
	});

	it('applies the animate-spin class', () => {
		const { container } = render(Spinner);
		const svg = container.querySelector('svg');
		expect(svg?.getAttribute('class')).toContain('animate-spin');
	});

	it('renders with default medium size', () => {
		const { container } = render(Spinner);
		const svg = container.querySelector('svg');
		const cls = svg?.getAttribute('class') || '';
		expect(cls).toContain('h-5');
		expect(cls).toContain('w-5');
	});

	it('renders with small size when specified', () => {
		const { container } = render(Spinner, { props: { size: 'sm' } });
		const svg = container.querySelector('svg');
		const cls = svg?.getAttribute('class') || '';
		expect(cls).toContain('h-4');
		expect(cls).toContain('w-4');
	});

	it('renders with large size when specified', () => {
		const { container } = render(Spinner, { props: { size: 'lg' } });
		const svg = container.querySelector('svg');
		const cls = svg?.getAttribute('class') || '';
		expect(cls).toContain('h-8');
		expect(cls).toContain('w-8');
	});

	it('applies primary color by default', () => {
		const { container } = render(Spinner);
		const svg = container.querySelector('svg');
		expect(svg?.getAttribute('class')).toContain('text-primary-600');
	});

	it('applies white color when specified', () => {
		const { container } = render(Spinner, { props: { color: 'white' } });
		const svg = container.querySelector('svg');
		expect(svg?.getAttribute('class')).toContain('text-white');
	});

	it('applies gray color when specified', () => {
		const { container } = render(Spinner, { props: { color: 'gray' } });
		const svg = container.querySelector('svg');
		expect(svg?.getAttribute('class')).toContain('text-gray-400');
	});
});
