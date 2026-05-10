<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import type { Bookmark, RecentItem } from '$lib/stores/bookmarks.svelte';
  import type { BucketInfo } from '$lib/types';

  let {
    open = $bindable(false),
    buckets = [],
    bookmarks = [],
    recentItems = [],
    onnavigate,
    onclose,
  }: {
    open: boolean;
    buckets: BucketInfo[];
    bookmarks: Bookmark[];
    recentItems: RecentItem[];
    onnavigate: (bucket: string, prefix: string) => void;
    onclose: () => void;
  } = $props();

  let searchQuery = $state('');
  let selectedIndex = $state(0);
  let searchInput: HTMLInputElement | undefined = $state();

  // Build flat list of all navigable items
  interface PaletteItem {
    type: 'bookmark' | 'recent' | 'bucket';
    label: string;
    sublabel: string;
    bucket: string;
    prefix: string;
    icon: 'star' | 'clock' | 'folder' | 'file' | 'bucket';
  }

  let allItems = $derived.by(() => {
    const items: PaletteItem[] = [];

    // Bookmarks
    for (const bm of bookmarks) {
      items.push({
        type: 'bookmark',
        label: bm.prefix ? bm.prefix.replace(/\/$/, '') : bm.bucket,
        sublabel: bm.prefix ? bm.bucket : '',
        bucket: bm.bucket,
        prefix: bm.prefix,
        icon: 'star',
      });
    }

    // Recent items
    for (const item of recentItems) {
      const prefix = item.isFolder
        ? item.key
        : item.key.split('/').slice(0, -1).join('/') + (item.key.includes('/') ? '/' : '');
      items.push({
        type: 'recent',
        label: item.name,
        sublabel: item.bucket,
        bucket: item.bucket,
        prefix: item.isFolder ? item.key : prefix,
        icon: item.isFolder ? 'folder' : 'file',
      });
    }

    // Buckets
    for (const b of buckets) {
      items.push({
        type: 'bucket',
        label: b.name,
        sublabel: '',
        bucket: b.name,
        prefix: '',
        icon: 'bucket',
      });
    }

    return items;
  });

  let filteredItems = $derived.by(() => {
    if (!searchQuery.trim()) return allItems;
    const q = searchQuery.toLowerCase().trim();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel.toLowerCase().includes(q) ||
        item.bucket.toLowerCase().includes(q)
    );
  });

  // Group filtered items by type
  let groupedItems = $derived.by(() => {
    const groups: { type: string; title: string; icon: string; items: PaletteItem[] }[] = [];

    const bms = filteredItems.filter((i) => i.type === 'bookmark');
    if (bms.length > 0) groups.push({ type: 'bookmark', title: 'Bookmarks', icon: '★', items: bms });

    const recent = filteredItems.filter((i) => i.type === 'recent');
    if (recent.length > 0) groups.push({ type: 'recent', title: 'Recent', icon: '🕐', items: recent });

    const bkts = filteredItems.filter((i) => i.type === 'bucket');
    if (bkts.length > 0) groups.push({ type: 'bucket', title: 'Buckets', icon: '🪣', items: bkts });

    return groups;
  });

  // Reset state when opening
  $effect(() => {
    if (open) {
      searchQuery = '';
      selectedIndex = 0;
      // Focus input after mount
      setTimeout(() => searchInput?.focus(), 50);
    }
  });

  // Clamp selected index when filtered items change
  $effect(() => {
    if (selectedIndex >= filteredItems.length) {
      selectedIndex = Math.max(0, filteredItems.length - 1);
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % Math.max(1, filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + filteredItems.length) % Math.max(1, filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredItems[selectedIndex];
      if (item) {
        onnavigate(item.bucket, item.prefix);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onclose();
    }
  }

  function handleItemClick(item: PaletteItem) {
    onnavigate(item.bucket, item.prefix);
  }

  /** Get the flat index of an item across all groups */
  function getFlatIndex(item: PaletteItem): number {
    return filteredItems.indexOf(item);
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
    onclick={onclose}
    role="button"
    tabindex="-1"
    aria-label="Close command palette"
    transition:fade={{ duration: 150 }}
  ></div>

  <!-- Command Palette Modal -->
  <div
    data-testid="command-palette"
    class="fixed inset-x-0 top-[15%] z-[60] mx-auto w-full max-w-lg px-4 sm:px-0"
    transition:fly={{ y: -20, duration: 200 }}
  >
    <div
      class="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-2xl overflow-hidden"
      onkeydown={handleKeydown}
    >
      <!-- Search input -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <svg class="h-5 w-5 text-gray-400 dark:text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          bind:this={searchInput}
          bind:value={searchQuery}
          type="text"
          placeholder="Search buckets, paths, bookmarks..."
          class="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0 p-0"
          data-testid="command-palette-search"
        />
        <kbd class="hidden sm:inline-flex items-center rounded border border-gray-200 dark:border-gray-600 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
          esc
        </kbd>
      </div>

      <!-- Results -->
      <div class="max-h-80 overflow-y-auto py-2">
        {#if filteredItems.length === 0}
          <div class="px-4 py-8 text-center">
            <p class="text-sm text-gray-400 dark:text-gray-500">No results found</p>
          </div>
        {:else}
          {#each groupedItems as group}
            <div class="px-3 pt-2 pb-1">
              <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
                {group.icon} {group.title}
              </p>
            </div>
            {#each group.items as item}
              {@const flatIdx = getFlatIndex(item)}
              <button
                onclick={() => handleItemClick(item)}
                onmouseenter={() => { selectedIndex = flatIdx; }}
                class="w-full flex items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors
                  {flatIdx === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}"
                data-testid="command-palette-item"
              >
                <!-- Icon -->
                {#if item.icon === 'star'}
                  <svg class="h-4 w-4 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                {:else if item.icon === 'clock'}
                  <svg class="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                {:else if item.icon === 'folder'}
                  <svg class="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2 7.5V18a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-6.5l-2-2.5H4a2 2 0 00-2 2z" />
                  </svg>
                {:else if item.icon === 'file'}
                  <svg class="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                {:else}
                  <svg class="h-4 w-4 text-primary-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
                  </svg>
                {/if}

                <!-- Label -->
                <span class="truncate font-medium">{item.label}</span>

                <!-- Sublabel -->
                {#if item.sublabel}
                  <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">({item.sublabel})</span>
                {/if}
              </button>
            {/each}
          {/each}
        {/if}
      </div>

      <!-- Footer with keyboard hints -->
      <div class="flex items-center gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <span class="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <kbd class="inline-flex items-center rounded border border-gray-200 dark:border-gray-600 px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
          Navigate
        </span>
        <span class="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <kbd class="inline-flex items-center rounded border border-gray-200 dark:border-gray-600 px-1 py-0.5 font-mono text-[10px]">↵</kbd>
          Open
        </span>
        <span class="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <kbd class="inline-flex items-center rounded border border-gray-200 dark:border-gray-600 px-1 py-0.5 font-mono text-[10px]">esc</kbd>
          Close
        </span>
      </div>
    </div>
  </div>
{/if}
