<script lang="ts">
  import ThemeToggle from './ThemeToggle.svelte';

  let {
    bucket = '',
    prefix = '',
    searchQuery = $bindable(''),
    searchMode = 'filter',
    authMode = 'manual',
    userEmail = '',
    userName = '',
    onsearchmodechange,
    onupload,
    onlogout,
    ontoggleSidebar,
  }: {
    bucket: string;
    prefix: string;
    searchQuery?: string;
    searchMode?: 'filter' | 'search';
    authMode?: 'manual' | 'fixed' | 'oidc';
    userEmail?: string;
    userName?: string;
    onsearchmodechange?: (mode: 'filter' | 'search') => void;
    onupload?: () => void;
    onlogout: () => void;
    ontoggleSidebar: () => void;
  } = $props();

  let inputEl: HTMLInputElement | undefined = $state();

  /** Derive the current folder name for the search badge */
  let currentFolderName = $derived(() => {
    if (!prefix) return bucket ? bucket + '/' : '/';
    const parts = prefix.split('/').filter(Boolean);
    return parts[parts.length - 1] + '/';
  });

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      searchQuery = '';
      inputEl?.blur();
    }
  }

  function clearSearch() {
    searchQuery = '';
    inputEl?.focus();
  }

  function toggleSearchMode() {
    const newMode = searchMode === 'filter' ? 'search' : 'filter';
    onsearchmodechange?.(newMode);
  }

  let searchPlaceholder = $derived(
    searchMode === 'search'
      ? 'Search recursively...'
      : `Filter in ${currentFolderName()}...`
  );

  /** Programmatically focus the search input */
  export function focusSearch() {
    inputEl?.focus();
  }

  let displayName = $derived(userName || userEmail || '');
</script>

<header class="flex h-[52px] items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 w-full z-50 shrink-0">
  <!-- Left: Logo + App Name -->
  <div class="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity duration-150 shrink-0">
    <!-- Mobile hamburger -->
    <button
      onclick={ontoggleSidebar}
      class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 lg:hidden transition-colors mr-1"
      aria-label="Open sidebar"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </button>

    <!-- Logo -->
    <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 11V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3"/>
        <path d="M8 4v16"/>
        <circle cx="15" cy="12" r="3"/>
        <path d="M15 9v6"/>
      </svg>
    </div>
    <span class="font-semibold text-primary-600 dark:text-primary-400 text-base hidden sm:inline">ObjectDock</span>
  </div>

  <!-- Center: Search bar with folder prefix badge -->
  {#if bucket}
    <div class="flex-1 flex justify-center max-w-2xl px-4 sm:px-8">
      <div class="relative w-full flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:border-primary-500 transition-all duration-150 focus-within:ring-1 focus-within:ring-primary-500 shadow-sm h-8 hover:border-gray-400 dark:hover:border-gray-500">
        <!-- Folder scope badge -->
        <div class="bg-gray-100 dark:bg-gray-600 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 border-r border-gray-300 dark:border-gray-500 flex items-center gap-1.5 h-full cursor-default shrink-0">
          <svg class="h-3.5 w-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2 7.5V18a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-6.5l-2-2.5H4a2 2 0 00-2 2z" />
          </svg>
          <span class="font-medium text-gray-700 dark:text-gray-200 max-w-[120px] truncate">{currentFolderName()}</span>
        </div>
        <!-- Search icon -->
        <svg class="absolute left-[calc(var(--badge-width,90px)+8px)] h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <!-- Search mode toggle -->
        <button
          data-testid="search-mode-toggle"
          onclick={toggleSearchMode}
          class="flex items-center justify-center w-8 h-full border-r border-gray-300 dark:border-gray-500 transition-colors
            {searchMode === 'search'
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
              : 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}"
          title={searchMode === 'search' ? 'Recursive search (all subfolders) — click to switch to filter' : 'Filter current folder — click to switch to recursive search'}
        >
          {#if searchMode === 'search'}
            <!-- Magnifying glass with folder: recursive search -->
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          {:else}
            <!-- Funnel: filter mode -->
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
          {/if}
        </button>
        <!-- Search input -->
        <div class="relative flex-1 flex items-center">
          <svg class="absolute left-2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            bind:this={inputEl}
            bind:value={searchQuery}
            type="text"
            placeholder={searchPlaceholder}
            onkeydown={handleSearchKeydown}
            class="w-full bg-transparent pl-7 pr-7 py-1 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          />
          {#if searchQuery}
            <button
              onclick={clearSearch}
              class="absolute right-1.5 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Clear search"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="flex-1"></div>
  {/if}

  <!-- Right: Theme + Account -->
  <div class="flex items-center gap-2 shrink-0">
    <ThemeToggle />

    {#if authMode === 'fixed'}
      <!-- Server credentials indicator (no logout available) -->
      <div
        class="flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 rounded-lg"
        title="Using server-configured credentials"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <span class="hidden sm:inline">Server credentials</span>
      </div>
    {:else if authMode === 'oidc'}
      <!-- OIDC user display with logout -->
      <div class="flex items-center gap-2">
        {#if displayName}
          <span class="hidden sm:inline text-xs text-gray-600 dark:text-gray-300 max-w-[160px] truncate" title={displayName}>
            {displayName}
          </span>
        {/if}
        <button
          onclick={onlogout}
          class="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white rounded-lg transition-all duration-150"
          title="Logout"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>
    {:else}
      <button
        onclick={onlogout}
        class="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white rounded-lg transition-all duration-150"
        title="Account / Logout"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
      </button>
    {/if}
  </div>
</header>
