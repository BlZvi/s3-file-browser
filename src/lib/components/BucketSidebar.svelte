<script lang="ts">
  import type { BucketInfo, FolderNode } from '$lib/types';
  import { fly } from 'svelte/transition';

  let {
    buckets,
    activeBucket,
    currentPrefix = '',
    onselectbucket,
    onnavigate,
    oncreatebucket,
    ondeletebucket,
    onopenbookmarks,
    mobileOpen = $bindable(false),
  }: {
    buckets: BucketInfo[];
    activeBucket: string;
    currentPrefix?: string;
    onselectbucket: (name: string) => void;
    onnavigate: (bucket: string, prefix: string) => void;
    oncreatebucket?: () => void;
    ondeletebucket?: (name: string) => void;
    onopenbookmarks?: () => void;
    mobileOpen?: boolean;
  } = $props();

  // Tree state: map of bucket name -> array of top-level folder nodes
  let bucketTrees = $state<Record<string, FolderNode[]>>({});
  // Track which buckets are expanded
  let expandedBuckets = $state<Set<string>>(new Set());
  // Track which buckets are loading their top-level folders
  let loadingBuckets = $state<Set<string>>(new Set());

  async function fetchFolders(bucket: string, prefix: string): Promise<FolderNode[]> {
    try {
      const params = new URLSearchParams({ bucket, prefix });
      const res = await fetch(`/api/s3/objects?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      const folders: string[] = data.folders || [];
      return folders.map((f: string) => {
        const name = f.slice(prefix.length).replace(/\/$/, '');
        return {
          prefix: f,
          name,
          loaded: false,
          expanded: false,
          loading: false,
          children: [],
        };
      });
    } catch {
      return [];
    }
  }

  async function toggleBucket(bucketName: string) {
    if (expandedBuckets.has(bucketName)) {
      // Collapse
      const next = new Set(expandedBuckets);
      next.delete(bucketName);
      expandedBuckets = next;
    } else {
      // Expand
      const next = new Set(expandedBuckets);
      next.add(bucketName);
      expandedBuckets = next;

      // Load top-level folders if not already loaded
      if (!bucketTrees[bucketName]) {
        const nextLoading = new Set(loadingBuckets);
        nextLoading.add(bucketName);
        loadingBuckets = nextLoading;

        const children = await fetchFolders(bucketName, '');
        bucketTrees = { ...bucketTrees, [bucketName]: children };

        const doneLoading = new Set(loadingBuckets);
        doneLoading.delete(bucketName);
        loadingBuckets = doneLoading;
      }
    }
  }

  async function toggleFolder(bucket: string, node: FolderNode) {
    if (node.expanded) {
      node.expanded = false;
    } else {
      node.expanded = true;
      if (!node.loaded) {
        node.loading = true;
        const children = await fetchFolders(bucket, node.prefix);
        node.children = children;
        node.loaded = true;
        node.loading = false;
      }
    }
  }

  function handleBucketClick(name: string) {
    onselectbucket(name);
    mobileOpen = false;
  }

  function handleFolderClick(bucket: string, prefix: string) {
    onnavigate(bucket, prefix);
    mobileOpen = false;
  }

  function isFolderActive(bucket: string, prefix: string): boolean {
    return activeBucket === bucket && currentPrefix === prefix;
  }

  function isBucketActive(name: string): boolean {
    return activeBucket === name && currentPrefix === '';
  }

  /** Check if a bucket's tree contains the active prefix (for visual cue) */
  function bucketContainsActivePath(name: string): boolean {
    return activeBucket === name;
  }
</script>

<!-- Mobile backdrop -->
{#if mobileOpen}
  <div
    class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
    onclick={() => { mobileOpen = false; }}
    onkeydown={(e) => { if (e.key === 'Escape') mobileOpen = false; }}
    role="button"
    tabindex="-1"
    aria-label="Close sidebar"
    transition:fly={{ duration: 200 }}
  ></div>
{/if}

<!-- Sidebar -->
<aside
  class="z-50 flex w-60 flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out shrink-0
    {mobileOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full'} lg:relative lg:translate-x-0"
>
  <!-- Mobile close button -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 lg:hidden">
    <span class="font-semibold text-gray-900 dark:text-white text-sm">Navigation</span>
    <button
      onclick={() => { mobileOpen = false; }}
      class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
      aria-label="Close sidebar"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <!-- Bookmarks button -->
  {#if onopenbookmarks}
    <div class="px-3 pt-3 pb-1">
      <button
        onclick={onopenbookmarks}
        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-700 dark:hover:text-yellow-400 transition-all duration-150 border border-transparent hover:border-yellow-200 dark:hover:border-yellow-800"
        data-testid="bookmarks-panel-btn"
      >
        <svg class="h-4 w-4 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        Bookmarks
      </button>
    </div>
  {/if}

  <!-- Buckets section -->
  <div class="px-3 pt-4 pb-2 flex items-center justify-between">
    <p class="px-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Buckets</p>
    {#if oncreatebucket}
      <button
        onclick={oncreatebucket}
        class="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        title="Create bucket"
        aria-label="Create bucket"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    {/if}
  </div>

  <nav class="flex-1 overflow-y-auto px-3 pb-3">
    <ul class="space-y-0.5">
      {#each buckets as bucket}
        <li>
          <!-- Bucket row -->
          <div class="flex items-center group">
            <!-- Chevron toggle -->
            <button
              onclick={() => toggleBucket(bucket.name)}
              class="flex-shrink-0 p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="{expandedBuckets.has(bucket.name) ? 'Collapse' : 'Expand'} {bucket.name}"
            >
              <svg
                class="h-3.5 w-3.5 transition-transform duration-150 {expandedBuckets.has(bucket.name) ? 'rotate-90' : ''}"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <!-- Bucket name button -->
            <button
              onclick={() => handleBucketClick(bucket.name)}
              class="flex flex-1 items-center rounded-lg px-2 py-2 text-left text-sm font-bold transition-all duration-150 min-w-0
                {isBucketActive(bucket.name)
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-2 border-blue-500 -ml-0.5 pl-1.5'
                  : bucketContainsActivePath(bucket.name)
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}"
            >
              <!-- Database icon -->
              <svg class="mr-2.5 h-4 w-4 flex-shrink-0 {bucketContainsActivePath(bucket.name) ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
              </svg>
              <span class="truncate">{bucket.name}</span>
            </button>
            <!-- Delete bucket button (visible on hover) -->
            {#if ondeletebucket}
              <button
                onclick={(e) => { e.stopPropagation(); ondeletebucket(bucket.name); }}
                class="flex-shrink-0 p-1 rounded text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all duration-150"
                title="Delete bucket"
                aria-label="Delete {bucket.name}"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            {/if}
          </div>

          <!-- Expanded folder tree -->
          {#if expandedBuckets.has(bucket.name)}
            <div class="ml-2">
              {#if loadingBuckets.has(bucket.name)}
                <div class="flex items-center gap-2 py-2 pl-6 text-xs text-gray-400 dark:text-gray-500">
                  <svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Loading…
                </div>
              {:else if bucketTrees[bucket.name]?.length === 0}
                <div class="py-1.5 pl-6 text-xs text-gray-400 dark:text-gray-500 italic">No folders</div>
              {:else}
                {#each bucketTrees[bucket.name] || [] as node}
                  {@render folderNode(bucket.name, node, 1)}
                {/each}
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </nav>

  <!-- Footer: Settings link -->
  <div class="mt-auto border-t border-gray-200 dark:border-gray-700 px-4 py-3">
    <button
      class="w-full text-gray-500 dark:text-gray-400 flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1.5 -mx-2 rounded-lg transition-all duration-150 text-sm"
      title="Settings"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span class="font-medium">Settings</span>
    </button>
  </div>
</aside>

{#snippet folderNode(bucket: string, node: FolderNode, level: number)}
  <div style="padding-left: {level * 16}px">
    <div class="flex items-center group">
      <!-- Chevron toggle -->
      <button
        onclick={() => toggleFolder(bucket, node)}
        class="flex-shrink-0 p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="{node.expanded ? 'Collapse' : 'Expand'} {node.name}"
      >
        {#if node.loading}
          <svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        {:else}
          <svg
            class="h-3 w-3 transition-transform duration-150 {node.expanded ? 'rotate-90' : ''}"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        {/if}
      </button>
      <!-- Folder name button -->
      <button
        onclick={() => handleFolderClick(bucket, node.prefix)}
        class="flex flex-1 items-center rounded-md px-2 py-1.5 text-left text-sm font-normal transition-all duration-150 min-w-0
          {isFolderActive(bucket, node.prefix)
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-2 border-blue-500 -ml-0.5 pl-1.5 font-medium'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'}"
      >
        <!-- Folder icon -->
        <svg class="mr-2 h-3.5 w-3.5 flex-shrink-0 {isFolderActive(bucket, node.prefix) ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2 7.5V18a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-6.5l-2-2.5H4a2 2 0 00-2 2z" />
        </svg>
        <span class="truncate">{node.name}</span>
      </button>
    </div>

    <!-- Children -->
    {#if node.expanded}
      {#if node.loading}
        <!-- Loading handled by spinner in chevron -->
      {:else if node.children.length === 0 && node.loaded}
        <div style="padding-left: {16}px" class="py-1 text-xs text-gray-400 dark:text-gray-500 italic">No subfolders</div>
      {:else}
        {#each node.children as child}
          {@render folderNode(bucket, child, level + 1)}
        {/each}
      {/if}
    {/if}
  </div>
{/snippet}
