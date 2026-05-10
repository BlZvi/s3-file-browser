<script lang="ts">
  import type { ObjectMetadata } from '$lib/types';
  import { addToast } from '$lib/components/Toast.svelte';
  import VersionHistory from './VersionHistory.svelte';
  import TagEditor from './TagEditor.svelte';

  let {
    metadata,
    bucketVersioning,
  }: {
    metadata: ObjectMetadata | null;
    bucketVersioning?: 'Enabled' | 'Suspended' | 'Disabled';
  } = $props();

  let customMetadataOpen = $state(false);
  let copiedField = $state('');

  // Tags state
  let objectTags = $state<Record<string, string>>({});
  let loadingTags = $state(false);
  let lastTagKey = $state('');

  // Fetch tags when metadata changes
  $effect(() => {
    if (metadata) {
      const key = `${metadata.bucket}:${metadata.key}`;
      if (key !== lastTagKey) {
        lastTagKey = key;
        fetchTags(metadata.bucket, metadata.key);
      }
    } else {
      objectTags = {};
      lastTagKey = '';
    }
  });

  async function fetchTags(bucket: string, key: string) {
    loadingTags = true;
    try {
      const params = new URLSearchParams({ bucket, key });
      const res = await fetch(`/api/s3/tags?${params}`);
      if (res.ok) {
        const data = await res.json();
        objectTags = data.tags || {};
      } else {
        objectTags = {};
      }
    } catch {
      objectTags = {};
    } finally {
      loadingTags = false;
    }
  }

  async function handleSaveTags(newTags: Record<string, string>) {
    if (!metadata) return;
    const res = await fetch('/api/s3/tags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: metadata.bucket, key: metadata.key, tags: newTags }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to save tags' }));
      throw new Error(data.error || 'Failed to save tags');
    }
    addToast('Object tags saved', 'success');
  }

  async function handleRestore(versionId: string) {
    if (!metadata) return;
    try {
      const res = await fetch('/api/s3/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: metadata.bucket, key: metadata.key, versionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Restore failed' }));
        throw new Error(data.error || 'Restore failed');
      }
      addToast('Version restored successfully', 'success');
    } catch (err: any) {
      addToast('Restore failed: ' + err.message, 'error');
    }
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }

  function formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  }

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      copiedField = field;
      addToast('Copied to clipboard', 'success');
      setTimeout(() => { copiedField = ''; }, 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      copiedField = field;
      setTimeout(() => { copiedField = ''; }, 2000);
    }
  }

  let hasCustomMetadata = $derived(
    metadata ? Object.keys(metadata.metadata).length > 0 : false
  );

  let customMetadataCount = $derived(
    metadata ? Object.keys(metadata.metadata).length : 0
  );

  let fileName = $derived(
    metadata ? metadata.key.split('/').pop() || metadata.key : ''
  );

  let filePath = $derived(
    metadata ? metadata.key.substring(0, metadata.key.lastIndexOf('/') + 1) || '/' : ''
  );

  let showVersionHistory = $derived(
    bucketVersioning === 'Enabled' || bucketVersioning === 'Suspended'
  );

  function truncateEtag(etag: string): string {
    if (etag.length > 20) {
      return etag.substring(0, 18) + '...';
    }
    return etag;
  }
</script>

{#if metadata}
  <!-- Properties section — horizontal key-value rows -->
  <div class="p-4 flex flex-col gap-2.5">
    <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Properties</span>

    <div class="flex flex-col gap-2.5">
      <!-- Path -->
      <div class="flex justify-between items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-1 -mx-1 rounded transition-colors">
        <span class="text-[11px] text-gray-500 dark:text-gray-400 font-medium shrink-0 pt-0.5">Path</span>
        <button
          onclick={() => copyToClipboard(`s3://${metadata!.bucket}/${metadata!.key}`, 'path')}
          class="font-mono text-[11px] text-gray-900 dark:text-white text-right break-all select-all cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          title="Click to copy"
        >
          s3://{metadata.bucket}/{metadata.key}
        </button>
      </div>

      <!-- Size -->
      <div class="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 px-1 -mx-1 rounded transition-colors">
        <span class="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Size</span>
        <span class="text-[12px] text-gray-900 dark:text-white font-bold">
          {formatSize(metadata.size)}
          <span class="font-normal text-gray-500 dark:text-gray-400 text-[11px] ml-1">({metadata.size.toLocaleString()} bytes)</span>
        </span>
      </div>

      <!-- Last Modified -->
      <div class="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 px-1 -mx-1 rounded transition-colors">
        <span class="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Modified</span>
        <span class="text-[12px] text-gray-900 dark:text-white font-bold">{formatDate(metadata.lastModified)}</span>
      </div>

      <!-- Content Type -->
      <div class="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 px-1 -mx-1 rounded transition-colors">
        <span class="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Type</span>
        <span class="font-mono text-[11px] text-gray-900 dark:text-white">{metadata.contentType}</span>
      </div>

      <!-- ETag -->
      <div class="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 px-1 -mx-1 rounded transition-colors">
        <span class="text-[11px] text-gray-500 dark:text-gray-400 font-medium">ETag</span>
        <span
          class="font-mono text-[11px] text-gray-900 dark:text-white select-all cursor-text truncate max-w-[180px]"
          title={metadata.etag}
        >{truncateEtag(metadata.etag)}</span>
      </div>

      <!-- Version ID (D12) -->
      {#if metadata.versionId && metadata.versionId !== 'null'}
        <div class="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 px-1 -mx-1 rounded transition-colors">
          <span class="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Version</span>
          <span
            class="font-mono text-[11px] text-gray-900 dark:text-white select-all cursor-text truncate max-w-[180px]"
            title={metadata.versionId}
          >{metadata.versionId.length > 16 ? metadata.versionId.substring(0, 14) + '…' : metadata.versionId}</span>
        </div>
      {/if}

      <!-- Storage Class -->
      {#if metadata.storageClass}
        <div class="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 px-1 -mx-1 rounded transition-colors">
          <span class="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Storage</span>
          <span class="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">
            {metadata.storageClass}
          </span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Custom Metadata collapsible -->
  {#if hasCustomMetadata}
    <div class="p-4 pt-1 flex flex-col gap-2">
      <button
        onclick={() => { customMetadataOpen = !customMetadataOpen; }}
        class="flex justify-between items-center cursor-pointer bg-gray-50 dark:bg-gray-700/50 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-[0.99]"
        title="Toggle Metadata"
      >
        <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Metadata ({customMetadataCount})</span>
        <svg
          class="h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 {customMetadataOpen ? 'rotate-180' : ''}"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {#if customMetadataOpen}
        <div class="border border-gray-200 dark:border-gray-700 rounded flex flex-col">
          {#each Object.entries(metadata.metadata) as [key, value], i}
            <div class="flex justify-between items-center px-3 py-2 text-[11px] hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors {i < Object.entries(metadata.metadata).length - 1 ? 'border-b border-gray-200/50 dark:border-gray-700/50' : ''}">
              <span class="font-mono text-gray-500 dark:text-gray-400 font-medium">{key}</span>
              <span class="font-bold text-gray-900 dark:text-white">{value}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Object Tags (D13) -->
  <div class="p-4 pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
    {#if loadingTags}
      <div class="flex items-center gap-1.5 py-2">
        <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tags</span>
        <svg class="animate-spin h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    {:else}
      <TagEditor
        bind:tags={objectTags}
        maxTags={10}
        onsave={handleSaveTags}
      />
    {/if}
  </div>

  <!-- Version History (D11) -->
  {#if showVersionHistory && metadata}
    <div class="border-t border-gray-200/50 dark:border-gray-700/50">
      <VersionHistory
        bucket={metadata.bucket}
        objectKey={metadata.key}
        onrestore={handleRestore}
      />
    </div>
  {/if}
{/if}
