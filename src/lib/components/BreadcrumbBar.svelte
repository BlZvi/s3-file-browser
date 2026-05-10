<script lang="ts">
  import type { BucketDetails } from '$lib/types';
  import { addToast } from '$lib/components/Toast.svelte';
  import { isBookmarked, toggleBookmark } from '$lib/stores/bookmarks.svelte';

  let {
    bucket,
    prefix,
    bucketInfo,
    creationDate,
    objectCount,
    isTruncated = false,
    onnavigate,
    onrefresh,
    oncreatefolder,
    onupload,
    ondetails,
  }: {
    bucket: string;
    prefix: string;
    bucketInfo?: BucketDetails | null;
    creationDate?: string;
    objectCount?: number;
    isTruncated?: boolean;
    onnavigate: (prefix: string) => void;
    onrefresh: () => void;
    oncreatefolder: () => void;
    onupload?: () => void;
    ondetails?: () => void;
  } = $props();

  let bookmarked = $derived(isBookmarked(bucket, prefix));

  function handleToggleBookmark() {
    toggleBookmark(bucket, prefix);
  }

  let segments = $derived(() => {
    if (!prefix) return [];
    const parts = prefix.split('/').filter(Boolean);
    return parts.map((part, i) => ({
      name: part,
      prefix: parts.slice(0, i + 1).join('/') + '/',
    }));
  });

  let formattedDate = $derived(() => {
    if (!creationDate) return '';
    try {
      return new Date(creationDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return creationDate;
    }
  });

  let isVersioned = $derived(bucketInfo?.versioning === 'Enabled');
  let isLocked = $derived(bucketInfo?.objectLocking === true);

  async function copyPath() {
    const path = `s3://${bucket}/${prefix}`;
    try {
      await navigator.clipboard.writeText(path);
      addToast('Path copied to clipboard', 'success');
    } catch {
      const input = document.createElement('input');
      input.value = path;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      addToast('Path copied to clipboard', 'success');
    }
  }
</script>

<div class="flex items-center justify-between shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 shadow-sm transition-shadow duration-150 hover:shadow">
  <!-- Left: Breadcrumb path + badges -->
  <div class="flex items-center gap-1.5 text-sm min-w-0 overflow-hidden">
    <!-- Bookmark star toggle -->
    <button
      onclick={handleToggleBookmark}
      class="p-1 rounded-lg transition-all duration-150 shrink-0 {bookmarked
        ? 'text-yellow-500 hover:text-yellow-600'
        : 'text-gray-300 dark:text-gray-600 hover:text-yellow-500 dark:hover:text-yellow-500'}"
      title={bookmarked ? 'Remove bookmark' : 'Bookmark this path'}
      data-testid="bookmark-toggle"
      data-bookmarked={bookmarked ? 'true' : 'false'}
    >
      {#if bookmarked}
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      {:else}
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      {/if}
    </button>

    <nav class="flex items-center gap-1.5 min-w-0 overflow-hidden" aria-label="Breadcrumb">
      <!-- Bucket icon -->
      <svg class="h-4 w-4 text-primary-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
      </svg>

      <!-- Bucket name -->
      <button
        onclick={() => onnavigate('')}
        class="text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-150 font-bold hover:bg-primary-50 dark:hover:bg-primary-900/20 px-1 rounded shrink-0"
      >
        {bucket}
      </button>

      {#each segments() as segment, i}
        <span class="text-gray-300 dark:text-gray-600 font-mono text-base shrink-0">/</span>

        {#if i === segments().length - 1}
          <span class="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md cursor-default truncate">
            {segment.name}
          </span>
        {:else}
          <button
            onclick={() => onnavigate(segment.prefix)}
            class="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-150 font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 px-1 rounded truncate"
          >
            {segment.name}
          </button>
        {/if}
      {/each}
    </nav>

    <!-- Badges (versioned, locked) — shown inline after breadcrumb -->
    {#if isVersioned}
      <span class="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400 shrink-0">
        Versioned
      </span>
    {/if}
    {#if isLocked}
      <span class="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 shrink-0">
        <svg class="h-2.5 w-2.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        Locked
      </span>
    {/if}
  </div>

  <!-- Right: Object count + actions -->
  <div class="flex items-center gap-1 shrink-0 ml-2">
    {#if objectCount !== undefined}
      <span class="text-[11px] text-gray-400 dark:text-gray-500 mr-1 shrink-0">
        {objectCount.toLocaleString()} item{objectCount !== 1 ? 's' : ''}{#if isTruncated} <span class="text-amber-500 dark:text-amber-400">(more…)</span>{/if}
      </span>
    {/if}

    <button
      onclick={copyPath}
      class="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-all duration-150"
      title="Copy S3 path"
    >
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
      </svg>
    </button>

    {#if ondetails}
      <button
        onclick={ondetails}
        class="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-all duration-150"
        title="Bucket Details"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
      </button>
    {/if}

    <button
      onclick={onrefresh}
      class="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-all duration-150"
      title="Refresh"
    >
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 14.652" />
      </svg>
    </button>

    <div class="w-px h-4 bg-gray-200 dark:bg-gray-600"></div>

    <button
      onclick={oncreatefolder}
      class="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-all duration-150"
      title="Create Folder"
    >
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    </button>

    {#if onupload}
      <button
        onclick={onupload}
        class="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-all duration-150"
        title="Upload"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </button>
    {/if}
  </div>
</div>
