<script lang="ts">
  let {
    isTruncated,
    loadingMore,
    objectCount,
    pageSize,
    autoLoadAll,
    onloadmore,
    onpagesizechange,
    onautoloadtoggle,
  }: {
    isTruncated: boolean;
    loadingMore: boolean;
    objectCount: number;
    pageSize: number;
    autoLoadAll: boolean;
    onloadmore: () => void;
    onpagesizechange: (size: number) => void;
    onautoloadtoggle: (val: boolean) => void;
  } = $props();

  const pageSizeOptions = [100, 200, 500, 1000];
</script>

<div
  data-testid="pagination-bar"
  class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 shadow-sm text-sm"
>
  <!-- Left: Object count -->
  <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
    {#if isTruncated}
      <span>Showing {objectCount.toLocaleString()} objects <span class="text-amber-600 dark:text-amber-400">(more available)</span></span>
    {:else}
      <span class="text-gray-400 dark:text-gray-500">All {objectCount.toLocaleString()} objects loaded</span>
    {/if}
  </div>

  <!-- Right: Controls -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
    <!-- Load more button -->
    {#if isTruncated}
      <button
        data-testid="load-more-btn"
        onclick={onloadmore}
        disabled={loadingMore}
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-primary-500 dark:hover:bg-primary-600 dark:focus:ring-primary-800"
      >
        {#if loadingMore}
          <svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading…
        {:else}
          Load more
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        {/if}
      </button>
    {/if}

    <!-- Auto-load all toggle -->
    {#if isTruncated}
      <label class="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
        <input
          data-testid="auto-load-toggle"
          type="checkbox"
          checked={autoLoadAll}
          onchange={(e) => onautoloadtoggle(e.currentTarget.checked)}
          class="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
        />
        Auto-load all
        {#if autoLoadAll}
          <span class="text-amber-500 dark:text-amber-400 text-[10px]">(may be slow for large directories)</span>
        {/if}
      </label>
    {/if}

    <!-- Page size selector -->
    <div class="flex items-center gap-1.5">
      <label for="page-size-select" class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Page size:</label>
      <select
        id="page-size-select"
        data-testid="page-size-select"
        value={pageSize}
        onchange={(e) => onpagesizechange(Number(e.currentTarget.value))}
        class="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:focus:border-primary-500"
      >
        {#each pageSizeOptions as opt}
          <option value={opt} selected={opt === pageSize}>{opt}</option>
        {/each}
      </select>
    </div>
  </div>
</div>
