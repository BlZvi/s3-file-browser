// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import PaginationBar from './PaginationBar.svelte';

const defaultProps = {
	isTruncated: true,
	loadingMore: false,
	objectCount: 200,
	pageSize: 200,
	autoLoadAll: false,
	onloadmore: vi.fn(),
	onpagesizechange: vi.fn(),
	onautoloadtoggle: vi.fn(),
};

describe('PaginationBar', () => {
	it('shows "Load more" button when truncated', () => {
		render(PaginationBar, { props: defaultProps });
		expect(screen.getByText(/load more/i)).toBeTruthy();
	});

	it('hides "Load more" button when not truncated', () => {
		render(PaginationBar, { props: { ...defaultProps, isTruncated: false } });
		expect(screen.queryByText(/load more/i)).toBeFalsy();
	});

	it('shows object count when truncated', () => {
		render(PaginationBar, { props: defaultProps });
		// Use a more specific regex to match "Showing 200 objects" but not the option element
		expect(screen.getByText(/showing 200 objects/i)).toBeTruthy();
	});

	it('shows "more available" text when truncated', () => {
		render(PaginationBar, { props: defaultProps });
		expect(screen.getByText(/more available/i)).toBeTruthy();
	});

	it('shows "All ... objects loaded" when not truncated', () => {
		render(PaginationBar, { props: { ...defaultProps, isTruncated: false } });
		expect(screen.getByText(/all.*200.*objects loaded/i)).toBeTruthy();
	});

	it('calls onloadmore when "Load more" is clicked', async () => {
		const onloadmore = vi.fn();
		render(PaginationBar, { props: { ...defaultProps, onloadmore } });
		await fireEvent.click(screen.getByTestId('load-more-btn'));
		expect(onloadmore).toHaveBeenCalled();
	});

	it('shows loading state when loadingMore is true', () => {
		render(PaginationBar, { props: { ...defaultProps, loadingMore: true } });
		expect(screen.getByText(/loading/i)).toBeTruthy();
	});

	it('disables Load more button when loadingMore is true', () => {
		render(PaginationBar, { props: { ...defaultProps, loadingMore: true } });
		const btn = screen.getByTestId('load-more-btn');
		expect(btn.hasAttribute('disabled')).toBe(true);
	});

	it('shows auto-load toggle when truncated', () => {
		render(PaginationBar, { props: defaultProps });
		expect(screen.getByTestId('auto-load-toggle')).toBeTruthy();
	});

	it('hides auto-load toggle when not truncated', () => {
		render(PaginationBar, { props: { ...defaultProps, isTruncated: false } });
		expect(screen.queryByTestId('auto-load-toggle')).toBeFalsy();
	});

	it('shows page size selector', () => {
		render(PaginationBar, { props: defaultProps });
		expect(screen.getByTestId('page-size-select')).toBeTruthy();
	});

	it('renders page size options', () => {
		render(PaginationBar, { props: defaultProps });
		const select = screen.getByTestId('page-size-select') as HTMLSelectElement;
		const options = select.querySelectorAll('option');
		const values = Array.from(options).map((o) => Number(o.value));
		expect(values).toEqual([100, 200, 500, 1000]);
	});

	it('shows warning text when autoLoadAll is enabled', () => {
		render(PaginationBar, { props: { ...defaultProps, autoLoadAll: true } });
		expect(screen.getByText(/may be slow/i)).toBeTruthy();
	});
});
