// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
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
		localStorageMock.getItem.mockReturnValue(null);
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
		const input = screen.getByLabelText(/^endpoint url/i);
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

	it('shows the Public Endpoint URL field under advanced options', async () => {
		render(LoginForm, { props: { onlogin: vi.fn() } });
		expect(screen.queryByLabelText(/public endpoint url/i)).toBeNull();
		await fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));
		expect(screen.getByLabelText(/public endpoint url/i)).toBeTruthy();
	});

	it('pre-fills the public endpoint from server defaults and expands advanced options', async () => {
		fetchMock.mockImplementation(() =>
			Promise.resolve(
				new Response(
					JSON.stringify({ valid: false, defaultEndpoint: '', defaultPublicEndpoint: 'https://s3.example.com', defaultRegion: '' }),
					{ status: 401 }
				)
			)
		);
		render(LoginForm, { props: { onlogin: vi.fn() } });
		const input = (await screen.findByLabelText(/public endpoint url/i)) as HTMLInputElement;
		expect(input.value).toBe('https://s3.example.com');
	});

	it('sends publicEndpoint in the login request', async () => {
		render(LoginForm, { props: { onlogin: vi.fn() } });
		await fireEvent.input(screen.getByLabelText(/access key id/i), { target: { value: 'key' } });
		await fireEvent.input(screen.getByLabelText(/secret access key/i), { target: { value: 'secret' } });
		await fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));
		await fireEvent.input(screen.getByLabelText(/public endpoint url/i), { target: { value: 'https://s3.example.com' } });
		await fireEvent.click(screen.getByRole('button', { name: /connect to storage/i }));

		const loginCall = (fetchMock.mock.calls as unknown as [string, RequestInit?][]).find(([url]) => url === '/api/auth/login');
		expect(loginCall).toBeTruthy();
		expect(JSON.parse(loginCall![1]!.body as string).publicEndpoint).toBe('https://s3.example.com');
	});
});
