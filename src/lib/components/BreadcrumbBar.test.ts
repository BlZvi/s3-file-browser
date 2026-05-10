// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import BreadcrumbBar from './BreadcrumbBar.svelte';

// Mock the bookmarks store — it uses $state internally and localStorage
vi.mock('$lib/stores/bookmarks.svelte', () => ({
	isBookmarked: vi.fn(() => false),
	toggleBookmark: vi.fn(),
}));

// Mock the Toast component's addToast export
vi.mock('$lib/components/Toast.svelte', () => ({
	addToast: vi.fn(),
}));

const defaultProps = {
	bucket: 'my-bucket',
	prefix: '',
	objectCount: 5,
	onnavigate: vi.fn(),
	onrefresh: vi.fn(),
	oncreatefolder: vi.fn(),
};

describe('BreadcrumbBar', () => {
	it('renders bucket name as first segment', () => {
		render(BreadcrumbBar, { props: defaultProps });
		expect(screen.getByText('my-bucket')).toBeTruthy();
	});

	it('renders path segments from prefix', () => {
		render(BreadcrumbBar, {
			props: { ...defaultProps, prefix: 'folder/subfolder/' },
		});
		expect(screen.getByText('folder')).toBeTruthy();
		expect(screen.getByText('subfolder')).toBeTruthy();
	});

	it('calls onnavigate with empty string when clicking bucket name', async () => {
		const onnavigate = vi.fn();
		render(BreadcrumbBar, {
			props: { ...defaultProps, onnavigate },
		});
		const bucketLink = screen.getByText('my-bucket');
		await fireEvent.click(bucketLink);
		expect(onnavigate).toHaveBeenCalledWith('');
	});

	it('calls onnavigate with correct prefix when clicking a non-last segment', async () => {
		const onnavigate = vi.fn();
		render(BreadcrumbBar, {
			props: { ...defaultProps, prefix: 'folder/subfolder/', onnavigate },
		});
		// 'folder' is the first segment (not the last), so it should be a clickable button
		const folderLink = screen.getByText('folder');
		await fireEvent.click(folderLink);
		expect(onnavigate).toHaveBeenCalledWith('folder/');
	});

	it('shows object count', () => {
		render(BreadcrumbBar, {
			props: { ...defaultProps, objectCount: 42 },
		});
		expect(screen.getByText(/42/)).toBeTruthy();
	});

	it('shows truncation indicator when isTruncated is true', () => {
		render(BreadcrumbBar, {
			props: { ...defaultProps, objectCount: 200, isTruncated: true },
		});
		// The component renders "(more…)" when isTruncated
		expect(screen.getByText(/more/)).toBeTruthy();
	});

	it('does not show truncation indicator when isTruncated is false', () => {
		render(BreadcrumbBar, {
			props: { ...defaultProps, objectCount: 200, isTruncated: false },
		});
		expect(screen.queryByText(/more…/)).toBeFalsy();
	});

	it('shows root path when prefix is empty', () => {
		render(BreadcrumbBar, {
			props: { ...defaultProps, prefix: '' },
		});
		// Should show bucket name but no path separator segments
		expect(screen.getByText('my-bucket')).toBeTruthy();
	});

	it('renders the last segment as non-clickable (current folder)', () => {
		render(BreadcrumbBar, {
			props: { ...defaultProps, prefix: 'folder/subfolder/' },
		});
		// The last segment 'subfolder' is rendered as a <span>, not a <button>
		const subfolder = screen.getByText('subfolder');
		expect(subfolder.tagName).toBe('SPAN');
	});

	it('calls onrefresh when refresh button is clicked', async () => {
		const onrefresh = vi.fn();
		render(BreadcrumbBar, {
			props: { ...defaultProps, onrefresh },
		});
		const refreshBtn = screen.getByTitle('Refresh');
		await fireEvent.click(refreshBtn);
		expect(onrefresh).toHaveBeenCalled();
	});

	it('calls oncreatefolder when create folder button is clicked', async () => {
		const oncreatefolder = vi.fn();
		render(BreadcrumbBar, {
			props: { ...defaultProps, oncreatefolder },
		});
		const createBtn = screen.getByTitle('Create Folder');
		await fireEvent.click(createBtn);
		expect(oncreatefolder).toHaveBeenCalled();
	});

	it('renders bookmark toggle button', () => {
		render(BreadcrumbBar, { props: defaultProps });
		const bookmarkBtn = screen.getByTestId('bookmark-toggle');
		expect(bookmarkBtn).toBeTruthy();
	});

	it('shows item count with correct pluralization for 1 item', () => {
		render(BreadcrumbBar, {
			props: { ...defaultProps, objectCount: 1 },
		});
		expect(screen.getByText(/1 item(?!s)/)).toBeTruthy();
	});

	it('shows item count with correct pluralization for multiple items', () => {
		render(BreadcrumbBar, {
			props: { ...defaultProps, objectCount: 5 },
		});
		expect(screen.getByText(/5 items/)).toBeTruthy();
	});
});
