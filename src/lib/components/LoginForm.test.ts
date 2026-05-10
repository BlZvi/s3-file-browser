// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import LoginForm from './LoginForm.svelte';

// Mock localStorage for onMount
const localStorageMock = {
	getItem: vi.fn((_key: string): string | null => null),
	setItem: vi.fn(),
	removeItem: vi.fn(),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Mock fetch for session defaults
const fetchMock = vi.fn(() =>
	Promise.resolve(new Response(JSON.stringify({ valid: false, defaultEndpoint: '', defaultRegion: '' }), { status: 401 }))
);
vi.stubGlobal('fetch', fetchMock);

describe('LoginForm', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchMock.mockImplementation(() =>
			Promise.resolve(new Response(JSON.stringify({ valid: false, defaultEndpoint: '', defaultRegion: '' }), { status: 401 }))
		);
	});

	it('renders the heading "Connect to Storage"', () => {
		render(LoginForm, { props: { onlogin: vi.fn() } });
		expect(screen.getByRole('heading', { name: /connect to storage/i })).toBeTruthy();
	});

	it('renders Access Key ID input field', () => {
		render(LoginForm, { props: { onlogin: vi.fn() } });
		const input = screen.getByLabelText(/access key id/i);
		expect(input).toBeTruthy();
	});

	it('renders Secret Access Key input field', () => {
		render(LoginForm, { props: { onlogin: vi.fn() } });
		const input = screen.getByLabelText(/secret access key/i);
		expect(input).toBeTruthy();
	});

	it('renders Endpoint URL input field', () => {
		render(LoginForm, { props: { onlogin: vi.fn() } });
		const input = screen.getByLabelText(/endpoint url/i);
		expect(input).toBeTruthy();
	});

	it('renders the Connect to Storage submit button', () => {
		render(LoginForm, { props: { onlogin: vi.fn() } });
		const button = screen.getByRole('button', { name: /connect to storage/i });
		expect(button).toBeTruthy();
	});

	it('renders the Test button', () => {
		render(LoginForm, { props: { onlogin: vi.fn() } });
		const button = screen.getByRole('button', { name: /test/i });
		expect(button).toBeTruthy();
	});

	it('renders the "Save endpoint locally" checkbox', () => {
		render(LoginForm, { props: { onlogin: vi.fn() } });
		expect(screen.getByText(/save endpoint locally/i)).toBeTruthy();
	});

	it('shows security notice about session-only credentials', () => {
		render(LoginForm, { props: { onlogin: vi.fn() } });
		expect(screen.getByText(/credentials are used only for this session/i)).toBeTruthy();
	});

	it('shows endpoint helper text', () => {
		render(LoginForm, { props: { onlogin: vi.fn() } });
		expect(screen.getByText(/required for non-aws s3/i)).toBeTruthy();
	});

	it('loads saved endpoint from localStorage on mount', () => {
		localStorageMock.getItem.mockReturnValue('https://minio.example.com');
		render(LoginForm, { props: { onlogin: vi.fn() } });
		expect(localStorageMock.getItem).toHaveBeenCalledWith('objectdock_endpoint');
	});
});
