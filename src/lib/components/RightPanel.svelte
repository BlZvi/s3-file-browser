<script lang="ts">
  import type { S3Object, ObjectMetadata } from '$lib/types';
  import PreviewPane from './PreviewPane.svelte';
  import MetadataPanel from './MetadataPanel.svelte';
  import Spinner from './Spinner.svelte';
  import { addToast } from '$lib/components/Toast.svelte';

  let {
    object,
    bucket,
    open = $bindable(false),
    ondownload,
    bucketVersioning,
  }: {
    object: S3Object | null;
    bucket: string;
    open?: boolean;
    ondownload: (key: string) => void;
    bucketVersioning?: 'Enabled' | 'Suspended' | 'Disabled';
  } = $props();

  let metadata = $state<ObjectMetadata | null>(null);
  let previewUrl = $state('');
  let loadingMeta = $state(false);
  let lastLoadedKey = $state('');
  let activeTab = $state<'preview' | 'details'>('preview');

  // Load metadata and preview URL when object changes
  $effect(() => {
    if (object && !object.isFolder && open) {
      const key = `${bucket}:${object.key}`;
      if (key !== lastLoadedKey) {
        lastLoadedKey = key;
        activeTab = 'preview';
        loadMetadata(object.key);
      }
    } else {
      metadata = null;
      previewUrl = '';
      lastLoadedKey = '';
    }
  });

  async function loadMetadata(key: string) {
    loadingMeta = true;
    metadata = null;
    previewUrl = '';

    try {
      // Fetch metadata and presigned URL in parallel
      const [metaRes, urlRes] = await Promise.all([
        fetch(`/api/s3/head?${new URLSearchParams({ bucket, key })}`),
        fetch(`/api/s3/download?${new URLSearchParams({ bucket, key })}`)
      ]);

      if (metaRes.ok) {
        metadata = await metaRes.json();
      } else {
        addToast('Failed to load file metadata', 'error');
      }

      if (urlRes.ok) {
        const data = await urlRes.json();
        previewUrl = data.url || '';
      } else {
        addToast('Failed to load preview', 'error');
      }
    } catch (err) {
      console.error('Failed to load object details:', err);
      addToast('Failed to load object details', 'error');
    } finally {
      loadingMeta = false;
    }
  }

  let fileName = $derived(
    object ? object.name : ''
  );

  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }

  function getFileType(name: string): string {
    const ext = name.split('.').pop()?.toUpperCase();
    return ext || 'FILE';
  }

  function getFileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, string> = {
      json: 'data_object',
      js: 'javascript',
      ts: 'code',
      html: 'html',
      css: 'css',
      svg: 'image',
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      gif: 'image',
      webp: 'image',
      pdf: 'picture_as_pdf',
      zip: 'folder_zip',
      gz: 'folder_zip',
      tar: 'folder_zip',
      md: 'description',
      txt: 'description',
      csv: 'table_chart',
      xml: 'code',
      yaml: 'settings',
      yml: 'settings',
      env: 'settings',
      log: 'receipt_long',
    };
    return iconMap[ext] || 'draft';
  }

  async function copyURI(key: string) {
    const uri = `s3://${bucket}/${key}`;
    try {
      await navigator.clipboard.writeText(uri);
      addToast('S3 URI copied to clipboard', 'success');
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = uri;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      addToast('S3 URI copied to clipboard', 'success');
    }
  }
</script>

<!-- Always rendered aside -->
<aside class="flex w-80 flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 shadow-[-8px_0_24px_rgba(0,0,0,0.04)] overflow-hidden">
  {#if open && object && !object.isFolder}
    <!-- Drawer Header: icon badge + filename + size/type + close button -->
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0 flex justify-between items-start">
      <div class="flex items-center gap-2.5">
        <!-- File type icon in a tinted badge -->
        <div class="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded flex items-center justify-center">
          <svg class="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            {#if getFileIcon(object.name) === 'image'}
              <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            {:else if getFileIcon(object.name) === 'data_object'}
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            {:else if getFileIcon(object.name) === 'code' || getFileIcon(object.name) === 'javascript'}
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            {:else if getFileIcon(object.name) === 'picture_as_pdf'}
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            {:else if getFileIcon(object.name) === 'folder_zip'}
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            {:else}
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            {/if}
          </svg>
        </div>
        <div>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white truncate w-48" title={fileName}>{fileName}</h2>
          <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
            {formatSize(object.size)} • {getFileType(object.name)}
          </p>
        </div>
      </div>
      <button
        onclick={() => { open = false; }}
        class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all active:scale-90 shrink-0"
        aria-label="Close panel"
        title="Close Panel (Esc)"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Drawer Tabs: Preview | Details -->
    <div class="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
      <button
        onclick={() => { activeTab = 'preview'; }}
        class="flex-1 py-2 flex justify-center items-center gap-1.5 text-xs font-semibold transition-all
          {activeTab === 'preview'
            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10 font-bold'
            : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 font-medium'}"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        Preview
      </button>
      <button
        onclick={() => { activeTab = 'details'; }}
        class="flex-1 py-2 flex justify-center items-center gap-1.5 text-xs font-semibold transition-all
          {activeTab === 'details'
            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10 font-bold'
            : 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 font-medium'}"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        Details
      </button>
    </div>

    <!-- Drawer Content (scrollable) -->
    <div class="flex-1 overflow-y-auto flex flex-col">
      {#if loadingMeta}
        <div class="flex-1 flex items-center justify-center p-8">
          <Spinner size="md" color="primary" />
        </div>
      {:else}
        {#if activeTab === 'preview'}
          <!-- Preview section — content only, no metadata -->
          <div class="flex-1 p-4 bg-gray-50 dark:bg-gray-800/50">
            <PreviewPane
              contentType={metadata?.contentType || ''}
              {previewUrl}
              {fileName}
            />
          </div>
        {:else}
          <!-- Details tab: metadata, tags, versions -->
          <MetadataPanel {metadata} {bucketVersioning} />
        {/if}
      {/if}
    </div>

    <!-- Footer Actions -->
    <div class="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex gap-3 shrink-0">
      <button
        onclick={() => copyURI(object!.key)}
        class="flex-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-[0.98]"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.757 8.188" />
        </svg>
        Copy URI
      </button>
      <button
        onclick={() => ondownload(object!.key)}
        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-blue-600/20 active:scale-[0.98]"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Download
      </button>
    </div>
  {:else}
    <!-- Empty state: centered message -->
    <div class="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
      <div class="text-center">
        <svg class="h-10 w-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        <p class="text-sm">Select a file to preview</p>
      </div>
    </div>
  {/if}
</aside>
