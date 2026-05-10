<script lang="ts">
  import { fly } from 'svelte/transition';
  import {
    getBookmarks,
    getRecentItems,
    removeBookmark,
    clearRecentItems,
    type Bookmark,
    type RecentItem,
  } from '$lib/stores/bookmarks.svelte';

  let {
    open = $bindable(false),
    onnavigate,
    onclose,
  }: {
    open: boolean;
    onnavigate: (bucket: string, prefix: string) => void;
    onclose: () => void;
  } = $props();

  let bookmarks = $derived(getBookmarks());
  let recentItems = $derived(getRecentItems());

  function handleBookmarkClick(bm: Bookmark) {
    onnavigate(bm.bucket, bm.prefix);
  }

  function handleRecentClick(item: RecentItem) {
    if (item.isFolder) {
      onnavigate(item.bucket, item.key);
    } else {
      // Navigate to the folder containing the file
      const parts = item.key.split('/');
      parts.pop();
      const prefix = parts.length > 0 ? parts.join('/') + '/' : '';
      onnavigate(item.bucket, prefix);
    }
  }

  function handleRemoveBookmark(e: MouseEvent, id: string) {
    e.stopPropagation();
    removeBookmark(id);
  }

  function handleClearRecent() {
    clearRecentItems();
  }

  function formatPath(bm: Bookmark): string {
    if (!bm.prefix) return bm.bucket + ' /';
    return bm.bucket + ' / ' + bm.prefix;
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
    onclick={onclose}
    onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}
    role="button"
    tabindex="-1"
    aria-label="Close bookmarks panel"
    transition:fly={{ duration: 150 }}
  ></div>

  <!-- Panel -->
  <div
    data-testid="bookmarks-panel"
    class="fixed right-0 top-0 z-50 h-full w-80 max-w-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl flex flex-col"
    transition:fly={{ x: 320, duration: 250 }}
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <svg class="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        Bookmarks & Recent
      </h2>
      <button
        onclick={onclose}
        class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Close panel"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Bookmarks Section -->
      <div class="px-4 pt-4 pb-2">
        <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <svg class="h-3.5 w-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Bookmarks
        </h3>
      </div>

      {#if bookmarks.length === 0}
        <div class="px-4 py-6 text-center">
          <p class="text-sm text-gray-400 dark:text-gray-500 italic">No bookmarks yet</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Click the star icon in the breadcrumb bar to bookmark a path</p>
        </div>
      {:else}
        <ul class="px-2 space-y-0.5" data-testid="bookmarks-list">
          {#each bookmarks as bm (bm.id)}
            <li>
              <div
                onclick={() => handleBookmarkClick(bm)}
                onkeydown={(e) => { if (e.key === 'Enter') handleBookmarkClick(bm); }}
                role="button"
                tabindex="0"
                class="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group cursor-pointer"
                data-testid="bookmark-item"
              >
                <svg class="h-3.5 w-3.5 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span class="truncate text-gray-700 dark:text-gray-300 font-medium">{formatPath(bm)}</span>
                <button
                  onclick={(e) => handleRemoveBookmark(e, bm.id)}
                  class="ml-auto p-1 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title="Remove bookmark"
                  aria-label="Remove bookmark"
                >
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Divider -->
      <div class="mx-4 my-3 border-t border-gray-200 dark:border-gray-700"></div>

      <!-- Recent Items Section -->
      <div class="px-4 pb-2 flex items-center justify-between">
        <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <svg class="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recent
        </h3>
        {#if recentItems.length > 0}
          <button
            onclick={handleClearRecent}
            class="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            data-testid="clear-recent-btn"
          >
            Clear all
          </button>
        {/if}
      </div>

      {#if recentItems.length === 0}
        <div class="px-4 py-6 text-center">
          <p class="text-sm text-gray-400 dark:text-gray-500 italic">No recent items</p>
        </div>
      {:else}
        <ul class="px-2 space-y-0.5" data-testid="recent-list">
          {#each recentItems as item, i (item.bucket + item.key + i)}
            <li>
              <button
                onclick={() => handleRecentClick(item)}
                class="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                data-testid="recent-item"
              >
                {#if item.isFolder}
                  <svg class="h-3.5 w-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2 7.5V18a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-6.5l-2-2.5H4a2 2 0 00-2 2z" />
                  </svg>
                {:else}
                  <svg class="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                {/if}
                <span class="truncate text-gray-700 dark:text-gray-300">{item.name}</span>
                <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">({item.bucket})</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
{/if}
