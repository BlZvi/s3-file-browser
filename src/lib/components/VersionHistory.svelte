<script lang="ts">
  import type { ObjectVersion } from '$lib/types';
  import Spinner from './Spinner.svelte';

  let {
    bucket,
    objectKey,
    onrestore,
    ondelete,
  }: {
    bucket: string;
    objectKey: string;
    onrestore?: (versionId: string) => void;
    ondelete?: (versionId: string) => void;
  } = $props();

  let versions = $state<ObjectVersion[]>([]);
  let deleteMarkers = $state<ObjectVersion[]>([]);
  let loading = $state(false);
  let error = $state('');
  let expanded = $state(false);
  let lastFetchedKey = $state('');

  // Combine versions and delete markers, sorted by lastModified descending
  let allVersions = $derived(() => {
    const combined = [...versions, ...deleteMarkers];
    combined.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    return combined;
  });

  let versionCount = $derived(versions.length + deleteMarkers.length);

  // Fetch versions when expanded and key changes
  $effect(() => {
    const key = `${bucket}:${objectKey}`;
    if (expanded && key !== lastFetchedKey) {
      lastFetchedKey = key;
      fetchVersions();
    }
  });

  async function fetchVersions() {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams({ bucket, prefix: objectKey });
      const res = await fetch(`/api/s3/versions?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to fetch versions' }));
        throw new Error(data.error || 'Failed to fetch versions');
      }
      const data = await res.json();
      versions = (data.versions || []).filter((v: ObjectVersion) => v.key === objectKey);
      deleteMarkers = (data.deleteMarkers || []).filter((v: ObjectVersion) => v.key === objectKey);
    } catch (err: any) {
      error = err.message || 'Failed to load versions';
      versions = [];
      deleteMarkers = [];
    } finally {
      loading = false;
    }
  }

  function formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }

  function truncateVersionId(id: string): string {
    if (!id || id === 'null') return '—';
    if (id.length > 16) return id.substring(0, 14) + '…';
    return id;
  }
</script>

<div class="p-4 pt-1 flex flex-col gap-2">
  <!-- Collapsible header -->
  <button
    onclick={() => { expanded = !expanded; }}
    class="flex justify-between items-center cursor-pointer bg-gray-50 dark:bg-gray-700/50 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-[0.99]"
    title="Toggle Version History"
  >
    <div class="flex items-center gap-1.5">
      <svg class="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Versions</span>
      {#if versionCount > 0 && !loading}
        <span class="inline-flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400 min-w-[18px]">
          {versionCount}
        </span>
      {/if}
    </div>
    <svg
      class="h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 {expanded ? 'rotate-180' : ''}"
      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  </button>

  {#if expanded}
    {#if loading}
      <div class="flex items-center justify-center py-4">
        <Spinner size="sm" color="gray" />
      </div>
    {:else if error}
      <div class="text-[11px] text-red-500 dark:text-red-400 py-2 text-center">
        {error}
      </div>
    {:else if allVersions().length === 0}
      <div class="text-[11px] text-gray-400 dark:text-gray-500 italic py-2 text-center">
        No versions available
      </div>
    {:else}
      <div class="border border-gray-200 dark:border-gray-700 rounded flex flex-col divide-y divide-gray-200/50 dark:divide-gray-700/50 max-h-64 overflow-y-auto">
        {#each allVersions() as version, i}
          <div class="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <!-- Top row: version ID + badges -->
            <div class="flex items-center gap-1.5 mb-1">
              <span
                class="font-mono text-[10px] text-gray-600 dark:text-gray-300 truncate"
                title={version.versionId}
              >
                {truncateVersionId(version.versionId)}
              </span>

              {#if version.isLatest}
                <span class="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 text-[9px] font-bold text-green-700 dark:text-green-400 uppercase">
                  Latest
                </span>
              {/if}

              {#if version.isDeleteMarker}
                <span class="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-[9px] font-bold text-red-700 dark:text-red-400 uppercase">
                  Deleted
                </span>
              {/if}
            </div>

            <!-- Bottom row: date, size, actions -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                <span>{formatDate(version.lastModified)}</span>
                {#if !version.isDeleteMarker}
                  <span>•</span>
                  <span>{formatSize(version.size)}</span>
                {/if}
              </div>

              {#if !version.isLatest}
                <div class="flex items-center gap-1">
                  {#if onrestore && !version.isDeleteMarker}
                    <button
                      onclick={() => onrestore?.(version.versionId)}
                      class="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Restore this version"
                    >
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                      </svg>
                      Restore
                    </button>
                  {/if}
                  {#if ondelete}
                    <button
                      onclick={() => ondelete?.(version.versionId)}
                      class="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete this version"
                    >
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                      Delete
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
