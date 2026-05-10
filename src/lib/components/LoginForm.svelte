<script lang="ts">
  import { Button, Input, Checkbox } from 'flowbite-svelte';
  import Spinner from './Spinner.svelte';
  import { onMount } from 'svelte';

  let {
    onlogin,
    oidcEnabled = false,
    oidcUser = undefined,
  }: {
    onlogin: (buckets: any[]) => void;
    oidcEnabled?: boolean;
    oidcUser?: { email: string; name?: string };
  } = $props();

  let accessKeyId = $state('');
  let secretAccessKey = $state('');
  let endpoint = $state('');
  let sessionToken = $state('');
  let defaultRegion = $state('');
  let rememberEndpoint = $state(false);
  let showAdvanced = $state(false);
  let loading = $state(false);
  let testing = $state(false);
  let testSuccess = $state(false);
  let error = $state('');
  let errorType = $state<'auth' | 'connection' | 'validation' | ''>('');

  onMount(async () => {
    const saved = localStorage.getItem('objectdock_endpoint');
    if (saved) {
      endpoint = saved;
      rememberEndpoint = true;
    }

    try {
      const res = await fetch('/api/auth/session');
      if (res.ok || res.status === 401) {
        const data = await res.json();
        if (!saved && data.defaultEndpoint) {
          endpoint = data.defaultEndpoint;
        }
        if (data.defaultRegion) {
          defaultRegion = data.defaultRegion;
        }
      }
    } catch {
      // Ignore fetch errors — defaults are optional
    }
  });

  function clearError() {
    error = '';
    errorType = '';
    testSuccess = false;
  }

  function classifyError(message: string): 'auth' | 'connection' {
    const authPatterns = ['invalid credentials', 'invalid access', 'accessdenied', 'forbidden', 'unauthorized', 'signature'];
    const lower = message.toLowerCase();
    return authPatterns.some(p => lower.includes(p)) ? 'auth' : 'connection';
  }

  async function doConnect(testOnly: boolean) {
    if (!accessKeyId || !secretAccessKey) {
      error = 'Access Key ID and Secret Access Key are required';
      errorType = 'validation';
      return;
    }

    if (testOnly) {
      testing = true;
    } else {
      loading = true;
    }
    clearError();

    // Persist endpoint preference
    if (rememberEndpoint && endpoint) {
      localStorage.setItem('objectdock_endpoint', endpoint);
    } else {
      localStorage.removeItem('objectdock_endpoint');
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKeyId,
          secretAccessKey,
          region: defaultRegion || 'us-east-1',
          endpoint: endpoint || undefined,
          ...(sessionToken && { sessionToken }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || 'Connection failed';
        error = msg;
        errorType = classifyError(msg);
        return;
      }

      if (testOnly) {
        testSuccess = true;
      } else {
        onlogin(data.buckets);
      }
    } catch (err: any) {
      error = err.message || 'Network error — cannot reach the server';
      errorType = 'connection';
    } finally {
      loading = false;
      testing = false;
    }
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    doConnect(false);
  }

  function handleTest() {
    doConnect(true);
  }

  function handleSSOLogin() {
    window.location.href = '/api/auth/oidc/login';
  }
</script>

<div>
  {#if oidcEnabled && !oidcUser}
    <!-- SSO Login as primary option -->
    <div class="mb-5">
      <h2 class="text-[20px] font-semibold leading-[28px] tracking-[-0.01em] text-on-surface dark:text-white">Sign In</h2>
      <p class="mt-0.5 text-[13px] leading-[18px] text-on-surface-variant dark:text-gray-400">Use your organization's single sign-on</p>
    </div>

    <Button
      onclick={handleSSOLogin}
      class="w-full bg-primary-600 hover:bg-primary-700 focus:ring-primary-300 dark:bg-primary-500 dark:hover:bg-primary-600 dark:focus:ring-primary-800 font-medium text-[14px] h-10 flex items-center justify-center gap-2"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
      Login with SSO
    </Button>

    <!-- Divider -->
    <div class="relative my-5">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-200 dark:border-gray-600"></div>
      </div>
      <div class="relative flex justify-center text-[12px]">
        <span class="bg-white dark:bg-gray-800 px-3 text-outline dark:text-gray-500">or enter credentials manually</span>
      </div>
    </div>
  {/if}

  {#if oidcUser}
    <!-- OIDC-authenticated user greeting -->
    <div class="mb-5">
      <div class="flex items-center gap-2.5 mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-[13px] leading-[18px] text-green-700 dark:border-green-800/40 dark:bg-green-900/15 dark:text-green-400">
        <svg class="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
        </svg>
        <div>
          <span class="font-medium">Signed in as {oidcUser.email}</span>
          {#if oidcUser.name}
            <span class="opacity-70"> ({oidcUser.name})</span>
          {/if}
        </div>
      </div>
      <h2 class="text-[20px] font-semibold leading-[28px] tracking-[-0.01em] text-on-surface dark:text-white">Connect to Storage</h2>
      <p class="mt-0.5 text-[13px] leading-[18px] text-on-surface-variant dark:text-gray-400">Enter your S3-compatible credentials to continue</p>
    </div>
  {:else if !oidcEnabled}
    <div class="mb-5">
      <h2 class="text-[20px] font-semibold leading-[28px] tracking-[-0.01em] text-on-surface dark:text-white">Connect to Storage</h2>
      <p class="mt-0.5 text-[13px] leading-[18px] text-on-surface-variant dark:text-gray-400">Enter your S3-compatible credentials</p>
    </div>
  {/if}

  {#if error}
    <div class="mb-3.5 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] leading-[18px]
      {errorType === 'auth'
        ? 'border-error/20 bg-error-container/20 text-error dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-400'
        : errorType === 'connection'
          ? 'border-amber-300/40 bg-amber-50 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/15 dark:text-amber-400'
          : 'border-error/20 bg-error-container/20 text-error dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-400'
      }" role="alert">
      {#if errorType === 'connection'}
        <svg class="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      {:else}
        <svg class="h-4 w-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
        </svg>
      {/if}
      <div class="flex-1">
        <span class="font-medium">{errorType === 'auth' ? 'Authentication failed' : errorType === 'connection' ? 'Connection failed' : 'Validation error'}</span>
        <p class="mt-0.5 opacity-80">{error}</p>
      </div>
      <button onclick={clearError} class="ml-auto -mt-0.5 -mr-1 rounded p-1 opacity-50 hover:opacity-100" aria-label="Dismiss">
        <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  {/if}

  {#if testSuccess}
    <div class="mb-3.5 flex items-center gap-2.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-[13px] leading-[18px] text-green-700 dark:border-green-800/40 dark:bg-green-900/15 dark:text-green-400" role="status">
      <svg class="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
      </svg>
      <span>Connection successful — credentials are valid</span>
    </div>
  {/if}

  <form onsubmit={handleSubmit} class="space-y-3.5">
    <div>
      <label for="accessKeyId" class="login-label">Access Key ID</label>
      <Input
        id="accessKeyId"
        type="text"
        placeholder="AKIA..."
        required
        bind:value={accessKeyId}
        class="login-input {errorType === 'auth' ? 'login-input-error' : ''}"
      />
    </div>

    <div>
      <label for="secretAccessKey" class="login-label">Secret Access Key</label>
      <Input
        id="secretAccessKey"
        type="password"
        placeholder="••••••••••••••••"
        required
        bind:value={secretAccessKey}
        class="login-input {errorType === 'auth' ? 'login-input-error' : ''}"
      />
      {#if errorType === 'auth'}
        <p class="mt-1 text-[12px] leading-[16px] text-error dark:text-red-400">Check your access key and secret</p>
      {/if}
    </div>

    <div>
      <label for="endpoint" class="login-label">
        Endpoint URL <span class="normal-case tracking-normal font-normal text-outline-variant dark:text-gray-500">(optional)</span>
      </label>
      <Input
        id="endpoint"
        type="url"
        placeholder="https://s3.example.com"
        bind:value={endpoint}
        class="login-input {errorType === 'connection' ? 'login-input-error' : ''}"
      />
      <p class="mt-1 text-[12px] leading-[16px] text-outline dark:text-gray-500">Required for non-AWS S3 (MinIO, Backblaze B2, etc.)</p>
      {#if errorType === 'connection'}
        <p class="mt-0.5 text-[12px] leading-[16px] text-amber-600 dark:text-amber-400">Verify the endpoint URL is reachable</p>
      {/if}
    </div>

    <!-- Advanced options (collapsible) -->
    <div>
      <button
        type="button"
        onclick={() => showAdvanced = !showAdvanced}
        class="flex items-center gap-1.5 text-[13px] leading-[18px] text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-gray-300 transition-colors"
      >
        <span class="text-[11px]">{showAdvanced ? '▼' : '▶'}</span>
        Advanced options
      </button>
      {#if showAdvanced}
        <div class="mt-2.5">
          <label for="sessionToken" class="login-label">
            Session Token <span class="normal-case tracking-normal font-normal text-outline-variant dark:text-gray-500">(optional)</span>
          </label>
          <Input
            id="sessionToken"
            type="password"
            placeholder="AWS STS session token"
            bind:value={sessionToken}
            class="login-input"
          />
          <p class="mt-1 text-[12px] leading-[16px] text-outline dark:text-gray-500">For AWS STS temporary credentials</p>
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      <Checkbox bind:checked={rememberEndpoint} />
      <span class="text-[13px] leading-[18px] text-on-surface-variant dark:text-gray-400">Save endpoint locally</span>
    </div>

    <!-- Action buttons -->
    <div class="flex gap-2.5 pt-0.5">
      <Button
        type="submit"
        class="flex-1 bg-primary-600 hover:bg-primary-700 focus:ring-primary-300 dark:bg-primary-500 dark:hover:bg-primary-600 dark:focus:ring-primary-800 font-medium text-[14px] h-10"
        disabled={loading || testing}
      >
        {#if loading}
          <Spinner size="sm" color="white" />
          <span class="ml-2">Connecting…</span>
        {:else}
          Connect to Storage
        {/if}
      </Button>
      <Button
        type="button"
        onclick={handleTest}
        class="border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 text-on-surface-variant dark:text-gray-300 font-medium text-[13px] h-10 px-4"
        disabled={loading || testing}
      >
        {#if testing}
          <Spinner size="sm" color="gray" />
        {:else}
          Test
        {/if}
      </Button>
    </div>

    <div class="flex items-center justify-center gap-1.5 pt-0.5">
      <svg class="h-3.5 w-3.5 text-outline dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
      <span class="text-[12px] leading-[16px] text-outline dark:text-gray-500">Credentials are used only for this session</span>
    </div>
  </form>
</div>

<style>
  :global(.login-label) {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 500;
    line-height: 16px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #737686;
  }
  :global(.dark .login-label) {
    color: #9ca3af;
  }
  :global(.login-input) {
    border-radius: 0.5rem !important;
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  :global(.login-input:focus) {
    border-color: #004ac6 !important;
    box-shadow: 0 0 0 2px rgba(0, 74, 198, 0.12) !important;
  }
  :global(.dark .login-input:focus) {
    border-color: #5c85f5 !important;
    box-shadow: 0 0 0 2px rgba(92, 133, 245, 0.15) !important;
  }
  :global(.login-input-error) {
    border-color: #BA1A1A !important;
  }
  :global(.dark .login-input-error) {
    border-color: #f87171 !important;
  }
</style>
