<script lang="ts">
  import { onMount } from 'svelte';
  import LoginForm from '$lib/components/LoginForm.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import type { BucketInfo } from '$lib/types';

  let checkingSession = $state(true);
  let oidcEnabled = $state(false);
  let oidcUser = $state<{ email: string; name?: string } | undefined>(undefined);

  onMount(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();

      if (data.valid) {
        // Fixed mode, OIDC+fixed, or existing valid session — skip login form
        // Use full navigation (not goto) so the server can set CSP headers
        // with the S3 endpoint from the session credentials
        window.location.href = '/browse';
        return;
      }

      // Check if OIDC is enabled
      if (data.oidcEnabled) {
        oidcEnabled = true;
      }

      // If mode is OIDC and user is not authenticated at all, redirect to OIDC login
      if (data.mode === 'oidc' && !data.user) {
        window.location.href = '/api/auth/oidc/login';
        return;
      }

      // If user is OIDC-authenticated but needs S3 creds, show the form
      if (data.user) {
        oidcUser = { email: data.user.email, name: data.user.name };
      }
    } catch {
      // Session check failed, show login form
    }
    checkingSession = false;
  });

  function handleLogin(buckets: BucketInfo[]) {
    // Use full navigation (not goto) so the server can set CSP headers
    // with the S3 endpoint from the now-available session credentials.
    // Client-side goto() would keep the old CSP from the login page
    // which lacks the S3 endpoint in connect-src.
    window.location.href = '/browse';
  }
</script>

{#if checkingSession}
  <!-- Show a minimal loading state while checking session -->
  <div class="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
    <div class="flex flex-col items-center gap-3">
      <svg class="h-8 w-8 animate-spin text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-sm text-gray-500 dark:text-gray-400">Checking session…</span>
    </div>
  </div>
{:else}
  <div class="relative flex min-h-screen">
    <!-- Theme toggle in corner -->
    <div class="absolute top-4 right-4 z-10">
      <ThemeToggle />
    </div>

    <!-- Left panel - branding -->
    <div class="hidden lg:flex lg:w-[440px] xl:w-[480px] bg-on-surface dark:bg-gray-950 relative overflow-hidden flex-shrink-0">
      <!-- Subtle grid pattern -->
      <div class="absolute inset-0 opacity-[0.03]">
        <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" stroke-width="0.4"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>

      <div class="relative z-10 flex flex-col justify-center px-12 xl:px-16">
        <!-- Logo + name -->
        <div class="mb-10">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 11V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3"/>
                <path d="M8 4v16"/>
                <circle cx="15" cy="12" r="3"/>
                <path d="M15 9v6"/>
              </svg>
            </div>
            <span class="text-lg font-semibold text-white tracking-tight">ObjectDock</span>
          </div>
          <p class="text-[13px] leading-[18px] text-gray-400 max-w-[280px]">
            S3-compatible object storage browser for AWS, MinIO, and other providers.
          </p>
        </div>

        <!-- Feature list — functional, scannable -->
        <div class="space-y-2.5">
          <div class="flex items-start gap-2.5 text-gray-500 text-[13px] leading-[18px]">
            <svg class="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Browse buckets and folders</span>
          </div>
          <div class="flex items-start gap-2.5 text-gray-500 text-[13px] leading-[18px]">
            <svg class="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span>Upload, download, and preview files</span>
          </div>
          <div class="flex items-start gap-2.5 text-gray-500 text-[13px] leading-[18px]">
            <svg class="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <span>Generate pre-signed links</span>
          </div>
          <div class="flex items-start gap-2.5 text-gray-500 text-[13px] leading-[18px]">
            <svg class="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span>Session-based access — no credentials stored</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right panel - login form -->
    <div class="flex w-full flex-1 items-center justify-center bg-gray-100 dark:bg-gray-900 p-6 sm:p-12">
      <div class="w-full max-w-[400px]">
        <!-- Mobile logo -->
        <div class="lg:hidden mb-8 text-center">
          <div class="inline-flex items-center gap-2.5">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-on-surface dark:bg-gray-800">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 11V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3"/>
                <path d="M8 4v16"/>
                <circle cx="15" cy="12" r="3"/>
                <path d="M15 9v6"/>
              </svg>
            </div>
            <span class="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">ObjectDock</span>
          </div>
        </div>

        <!-- Elevated form card -->
        <div class="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm p-7">
          <LoginForm onlogin={handleLogin} {oidcEnabled} {oidcUser} />
        </div>
      </div>
    </div>
  </div>
{/if}
