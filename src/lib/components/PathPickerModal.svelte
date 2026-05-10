<script lang="ts">
  import { Modal, Button, Select } from 'flowbite-svelte';
  import { FolderSolid, ChevronRightOutline } from 'flowbite-svelte-icons';
  import type { BucketInfo } from '$lib/types';

  let {
    open = $bindable(false),
    buckets = [],
    currentBucket = '',
    currentPrefix = '',
    mode = 'copy',
    objectName = '',
    onsubmit,
  }: {
    open: boolean;
    buckets: BucketInfo[];
    currentBucket: string;
    currentPrefix: string;
    mode: 'copy' | 'move';
    objectName: string;
    onsubmit: (dest: { bucket: string; prefix: string }) => void;
  } = $props();

  let selectedBucket = $state('');
  let selectedPrefix = $state('');
  let folders = $state<string[]>([]);
  let loadingFolders = $state(false);

  // Breadcrumb segments
  let breadcrumbs = $derived(() => {
    if (!selectedPrefix) return [];
    const parts = selectedPrefix.split('/').filter(Boolean);
    return parts.map((part, i) => ({
      name: part,
      prefix: parts.slice(0, i + 1).join('/') + '/'
    }));
  });

  // Initialize when modal opens
  $effect(() => {
    if (open) {
      selectedBucket = currentBucket;
      selectedPrefix = currentPrefix;
      loadFolders();
    }
  });

  async function loadFolders() {
    if (!selectedBucket) {
      folders = [];
      return;
    }
    loadingFolders = true;
    try {
      const params = new URLSearchParams({ bucket: selectedBucket, prefix: selectedPrefix });
      const res = await fetch(`/api/s3/objects?${params}`);
      if (!res.ok) throw new Error('Failed to load folders');
      const data = await res.json();
      // Only show folders, not files
      folders = (data.objects || [])
        .filter((o: any) => o.isFolder)
        .map((o: any) => o.key);
    } catch {
      folders = [];
    } finally {
      loadingFolders = false;
    }
  }

  function handleBucketChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    selectedBucket = target.value;
    selectedPrefix = '';
    loadFolders();
  }

  function navigateToFolder(folderKey: string) {
    selectedPrefix = folderKey;
    loadFolders();
  }

  function navigateToRoot() {
    selectedPrefix = '';
    loadFolders();
  }

  function navigateToBreadcrumb(prefix: string) {
    selectedPrefix = prefix;
    loadFolders();
  }

  function handleSelect() {
    onsubmit({ bucket: selectedBucket, prefix: selectedPrefix });
    open = false;
  }

  function getFolderDisplayName(folderKey: string): string {
    // Remove the current prefix and trailing slash to get just the folder name
    const relative = folderKey.slice(selectedPrefix.length);
    return relative.replace(/\/$/, '');
  }
</script>

<Modal title="{mode === 'copy' ? 'Copy' : 'Move'} — {objectName}" bind:open size="md">
  <div class="space-y-4">
    <!-- Bucket selector -->
    <div>
      <label for="destBucket" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Destination Bucket
      </label>
      <Select id="destBucket" value={selectedBucket} onchange={handleBucketChange}>
        {#each buckets as bucket}
          <option value={bucket.name}>{bucket.name}</option>
        {/each}
      </Select>
    </div>

    <!-- Breadcrumb navigation -->
    <div class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 flex-wrap min-h-[28px]">
      <button
        type="button"
        class="hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
        onclick={navigateToRoot}
      >
        {selectedBucket}
      </button>
      <ChevronRightOutline class="h-3 w-3 flex-shrink-0" />
      {#each breadcrumbs() as crumb}
        <button
          type="button"
          class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          onclick={() => navigateToBreadcrumb(crumb.prefix)}
        >
          {crumb.name}
        </button>
        <ChevronRightOutline class="h-3 w-3 flex-shrink-0" />
      {/each}
    </div>

    <!-- Folder list -->
    <div class="max-h-64 min-h-[120px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
      {#if loadingFolders}
        <div class="flex items-center justify-center py-8">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading...</span>
        </div>
      {:else if folders.length === 0}
        <div class="flex items-center justify-center py-8 text-sm text-gray-400 dark:text-gray-500">
          No subfolders
        </div>
      {:else}
        {#each folders as folder}
          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
            ondblclick={() => navigateToFolder(folder)}
            onclick={() => navigateToFolder(folder)}
          >
            <FolderSolid class="h-4 w-4 flex-shrink-0 text-amber-400" />
            <span class="truncate">{getFolderDisplayName(folder)}</span>
          </button>
        {/each}
      {/if}
    </div>

    <!-- Destination preview -->
    <div class="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800">
      <p class="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Destination:</p>
      <p class="text-sm text-blue-800 dark:text-blue-200 font-mono break-all">
        {selectedBucket}/{selectedPrefix}{objectName}
      </p>
    </div>
  </div>

  {#snippet footer()}
    <div class="flex w-full justify-end gap-2">
      <Button color="alternative" onclick={() => { open = false; }}>
        Cancel
      </Button>
      <Button onclick={handleSelect} disabled={!selectedBucket} class="bg-primary-600 hover:bg-primary-700 text-white">
        {mode === 'copy' ? 'Copy here' : 'Move here'}
      </Button>
    </div>
  {/snippet}
</Modal>
