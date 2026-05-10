<script lang="ts">
  import type { BucketDetails } from '$lib/types';

  let {
    bucket,
    bucketInfo,
    creationDate,
    objectCount,
    isTruncated = false,
    onrefresh,
    onupload,
    ondetails,
  }: {
    bucket: string;
    bucketInfo: BucketDetails | null;
    creationDate?: string;
    objectCount?: number;
    isTruncated?: boolean;
    onrefresh: () => void;
    onupload: () => void;
    ondetails?: () => void;
  } = $props();

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
</script>

<div class="h-10 flex items-center justify-between shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 shadow-sm transition-shadow duration-150 hover:shadow">
  <!-- Left: Bucket info -->
  <div class="flex items-center gap-2 text-sm min-w-0 overflow-hidden">
    <!-- Bucket icon -->
    <svg class="h-4 w-4 text-primary-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
    </svg>

    <!-- Bucket name (clickable to open details) -->
    {#if ondetails}
      <button
        onclick={ondetails}
        class="font-bold text-gray-900 dark:text-gray-100 shrink-0 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
        title="View bucket details"
      >{bucket}</button>
    {:else}
      <span class="font-bold text-gray-900 dark:text-gray-100 shrink-0">{bucket}</span>
    {/if}

    {#if formattedDate()}
      <span class="text-gray-400 dark:text-gray-500 shrink-0">•</span>
      <span class="text-gray-500 dark:text-gray-400 text-xs shrink-0">Created {formattedDate()}</span>
    {/if}

    <!-- Badges -->
    {#if isVersioned}
      <span class="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 shrink-0">
        Versioned
      </span>
    {/if}

    {#if isLocked}
      <span class="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 shrink-0">
        <svg class="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        Locked
      </span>
    {/if}
  </div>

  <!-- Right: Object count + Refresh + Upload -->
  <div class="flex items-center gap-1.5 shrink-0 ml-2">
    {#if objectCount !== undefined}
      <span class="text-xs text-gray-500 dark:text-gray-400 mr-1">
        {objectCount.toLocaleString()} object{objectCount !== 1 ? 's' : ''}{#if isTruncated} <span class="text-amber-500 dark:text-amber-400">(more available)</span>{/if}
      </span>
    {/if}

    {#if ondetails}
      <button
        onclick={ondetails}
        class="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-all duration-150"
        title="Bucket Details"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
      </button>
    {/if}

    <button
      onclick={onrefresh}
      class="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-all duration-150"
      title="Refresh"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 14.652" />
      </svg>
    </button>

    <div class="w-px h-4 bg-gray-200 dark:bg-gray-600"></div>

    <button
      onclick={onupload}
      class="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-all duration-150"
      title="Upload"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    </button>
  </div>
</div>
