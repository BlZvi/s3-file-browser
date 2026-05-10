<script lang="ts">
  import type { S3Object } from '$lib/types';
  import {
    FolderSolid,
    FileSolid,
    DownloadOutline,
    TrashBinOutline,
    ClipboardOutline,
  } from 'flowbite-svelte-icons';
  import { Button, Checkbox } from 'flowbite-svelte';
  import { addToast } from '$lib/components/Toast.svelte';

  let {
    objects,
    loading,
    selectedObject = null,
    highlightKeys = [],
    focusedIndex = -1,
    editingKey = '',
    showFullPath = false,
    onnavigate,
    ondownload,
    ondelete,
    onpresign,
    onselect,
    oncontextmenu,
    onbulkdownload,
    onrename,
  }: {
    objects: S3Object[];
    loading: boolean;
    selectedObject?: S3Object | null;
    highlightKeys?: string[];
    focusedIndex?: number;
    editingKey?: string;
    showFullPath?: boolean;
    onnavigate: (prefix: string) => void;
    ondownload: (key: string) => void;
    ondelete: (keys: string[]) => void;
    onpresign: (key: string) => void;
    onselect?: (obj: S3Object) => void;
    oncontextmenu?: (e: MouseEvent, obj: S3Object) => void;
    onbulkdownload?: (keys: string[]) => void;
    onrename?: (key: string, newName: string) => void;
  } = $props();

  function getParentPath(key: string): string {
    const lastSlash = key.lastIndexOf('/');
    if (lastSlash <= 0) return '';
    return key.slice(0, lastSlash + 1);
  }

  let editValue = $state('');

  function startEditing(obj: S3Object) {
    editValue = obj.isFolder ? obj.name : obj.name;
  }

  function confirmRename(obj: S3Object) {
    if (editValue.trim() && editValue.trim() !== obj.name) {
      onrename?.(obj.key, editValue.trim());
    }
  }

  function handleEditKeydown(e: KeyboardEvent, obj: S3Object) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmRename(obj);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Cancel editing — parent should clear editingKey
      onrename?.(obj.key, obj.name); // same name = no-op, signals cancel
    }
  }

  // Svelte action: auto-focus and select text in input
  function autoFocusSelect(node: HTMLInputElement) {
    node.focus();
    // Select filename without extension
    const dotIndex = editValue.lastIndexOf('.');
    if (dotIndex > 0) {
      node.setSelectionRange(0, dotIndex);
    } else {
      node.select();
    }
  }

  // Initialize editValue when editingKey changes
  $effect(() => {
    if (editingKey) {
      const obj = objects.find((o) => o.key === editingKey);
      if (obj) {
        startEditing(obj);
      }
    }
  });

  let selectedKeys = $state<Set<string>>(new Set());
  let sortField = $state<'name' | 'size' | 'lastModified'>('name');
  let sortAsc = $state(true);
  let bodyEl: HTMLDivElement | undefined = $state();

  let allSelected = $derived(objects.length > 0 && selectedKeys.size === objects.length);

  let sortedObjects = $derived(() => {
    const sorted = [...objects].sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'size') cmp = a.size - b.size;
      else if (sortField === 'lastModified') cmp = (a.lastModified || '').localeCompare(b.lastModified || '');
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  });

  // ── Virtual Scroll ──────────────────────────────────────────────────
  const VIRTUAL_THRESHOLD = 200;
  const ROW_HEIGHT = 40; // pixels — matches h-10 (2.5rem = 40px)
  const OVERSCAN = 10;

  let scrollContainer = $state<HTMLElement | null>(null);
  let containerHeight = $state(600); // Default, updated dynamically
  let scrollTop = $state(0);

  let useVirtualScroll = $derived(sortedObjects().length > VIRTUAL_THRESHOLD);

  // Virtual scroll calculations
  let virtualStart = $derived(
    useVirtualScroll
      ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
      : 0
  );
  let virtualEnd = $derived(
    useVirtualScroll
      ? Math.min(sortedObjects().length, virtualStart + Math.ceil(containerHeight / ROW_HEIGHT) + 2 * OVERSCAN)
      : sortedObjects().length
  );
  let totalHeight = $derived(sortedObjects().length * ROW_HEIGHT);
  let offsetY = $derived(virtualStart * ROW_HEIGHT);

  let visibleObjects = $derived(
    useVirtualScroll
      ? sortedObjects().slice(virtualStart, virtualEnd)
      : sortedObjects()
  );

  function handleVirtualScroll(e: Event) {
    scrollTop = (e.target as HTMLElement).scrollTop;
  }

  // Reset scroll position when objects change (e.g., navigating to new folder)
  let prevObjectsRef = $state<S3Object[]>([]);
  $effect(() => {
    if (objects !== prevObjectsRef) {
      prevObjectsRef = objects;
      scrollTop = 0;
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
    }
  });

  // Auto-scroll to focused item (virtual scroll mode)
  $effect(() => {
    if (useVirtualScroll && focusedIndex >= 0 && scrollContainer) {
      const itemTop = focusedIndex * ROW_HEIGHT;
      const itemBottom = itemTop + ROW_HEIGHT;
      const viewTop = scrollContainer.scrollTop;
      const viewBottom = viewTop + containerHeight;

      if (itemTop < viewTop) {
        scrollContainer.scrollTop = itemTop;
      } else if (itemBottom > viewBottom) {
        scrollContainer.scrollTop = itemBottom - containerHeight;
      }
    }
  });

  // Scroll focused row into view (non-virtual scroll mode)
  $effect(() => {
    if (!useVirtualScroll && focusedIndex >= 0 && bodyEl) {
      const rows = bodyEl.querySelectorAll('[data-row]');
      const row = rows[focusedIndex];
      if (row) {
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  });

  // ResizeObserver for dynamic container height
  $effect(() => {
    if (!scrollContainer) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight = entry.contentRect.height;
      }
    });
    observer.observe(scrollContainer);
    return () => observer.disconnect();
  });
  // ── End Virtual Scroll ──────────────────────────────────────────────

  function getFileIconColor(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'];
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
    const archiveExts = ['zip', 'tar', 'gz', 'rar', '7z', 'bz2'];
    const codeExts = ['js', 'ts', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'css', 'html', 'json', 'xml', 'yaml', 'yml', 'toml', 'svelte', 'vue', 'jsx', 'tsx'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
    const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'webm', 'wmv'];
    const spreadsheetExts = ['xls', 'xlsx', 'csv'];

    if (imageExts.includes(ext)) return 'text-pink-500';
    if (docExts.includes(ext)) return 'text-red-500';
    if (archiveExts.includes(ext)) return 'text-amber-500';
    if (codeExts.includes(ext)) return 'text-emerald-500';
    if (audioExts.includes(ext)) return 'text-purple-500';
    if (videoExts.includes(ext)) return 'text-blue-500';
    if (spreadsheetExts.includes(ext)) return 'text-green-500';
    return 'text-gray-400 dark:text-gray-500';
  }

  function getFileExtension(obj: S3Object): string {
    if (obj.isFolder) return '';
    const ext = obj.name.split('.').pop()?.toLowerCase() || '';
    return ext ? `.${ext}` : '';
  }

  function toggleSort(field: 'name' | 'size' | 'lastModified') {
    if (sortField === field) sortAsc = !sortAsc;
    else { sortField = field; sortAsc = true; }
  }

  function toggleSelectAll() {
    selectedKeys = allSelected ? new Set() : new Set(objects.map((o) => o.key));
  }

  function toggleSelect(key: string) {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selectedKeys = next;
  }

  function handleRowClick(obj: S3Object) {
    if (obj.isFolder) {
      onnavigate(obj.key);
    } else {
      onselect?.(obj);
    }
  }

  function handleRowDblClick(obj: S3Object) {
    if (!obj.isFolder) {
      ondownload(obj.key);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }

  function formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  function formatDateFull(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString();
  }

  function deleteSelected() {
    if (selectedKeys.size > 0) {
      ondelete(Array.from(selectedKeys));
      selectedKeys = new Set();
    }
  }

  function downloadSelected() {
    if (selectedKeys.size > 0 && onbulkdownload) {
      onbulkdownload(Array.from(selectedKeys));
    }
  }

  async function copySelectedURIs() {
    if (selectedKeys.size === 0) return;
    const uris = Array.from(selectedKeys).join('\n');
    try {
      await navigator.clipboard.writeText(uris);
      addToast(`Copied ${selectedKeys.size} path${selectedKeys.size !== 1 ? 's' : ''} to clipboard`, 'success');
    } catch {
      addToast('Failed to copy to clipboard', 'error');
    }
  }

  async function copyPath(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      addToast('Path copied to clipboard', 'success');
    } catch {
      addToast('Failed to copy to clipboard', 'error');
    }
  }

  function getSortIcon(field: string): string {
    if (sortField !== field) return '↕';
    return sortAsc ? '↑' : '↓';
  }

  function isSelected(obj: S3Object): boolean {
    return selectedObject?.key === obj.key;
  }

  function isHighlighted(obj: S3Object): boolean {
    return highlightKeys.includes(obj.key);
  }

  function isFocused(i: number): boolean {
    return focusedIndex === i;
  }

  const gridCols = 'grid-cols-[40px_minmax(200px,1fr)_100px_140px_80px_100px]';
</script>

<style>
  @keyframes highlight {
    0% { background-color: rgb(219 234 254 / 0.5); }
    100% { background-color: transparent; }
  }
  :global(.animate-highlight) {
    animation: highlight 2s ease-out forwards;
  }
</style>

{#if selectedKeys.size > 0}
  <div class="mb-3 flex items-center gap-3 rounded-lg bg-primary-50 p-3 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
    <span class="text-sm font-medium text-primary-700 dark:text-primary-300">
      {selectedKeys.size} selected
    </span>
    <Button size="xs" color="light" onclick={downloadSelected}>
      <DownloadOutline class="mr-1 h-3 w-3" />
      Download
    </Button>
    <Button size="xs" color="light" onclick={copySelectedURIs}>
      <ClipboardOutline class="mr-1 h-3 w-3" />
      Copy URIs
    </Button>
    <Button size="xs" color="red" onclick={deleteSelected}>
      <TrashBinOutline class="mr-1 h-3 w-3" />
      Delete
    </Button>
    <button
      onclick={() => { selectedKeys = new Set(); }}
      class="ml-auto text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
    >
      Clear
    </button>
  </div>
{/if}

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- Table Container -->
<div class="flex-1 flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden shadow-sm relative focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500" tabindex="0" role="grid" aria-label="File list">
  <!-- Table Header -->
  <div class="grid {gridCols} bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-4 py-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0 select-none" role="row">
    <div class="flex items-center justify-center" role="columnheader">
      <Checkbox checked={allSelected} onchange={toggleSelectAll} />
    </div>
    <button
      type="button"
      class="flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150 active:opacity-70 bg-transparent border-none p-0 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
      onclick={() => toggleSort('name')}
      title="Sort by Name"
    >
      Name <span class="text-blue-500 text-[12px]">{getSortIcon('name')}</span>
    </button>
    <button
      type="button"
      class="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150 active:opacity-70 bg-transparent border-none p-0 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
      onclick={() => toggleSort('size')}
      title="Sort by Size"
    >
      Size <span class="text-gray-400 text-[12px]">{getSortIcon('size')}</span>
    </button>
    <button
      type="button"
      class="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150 active:opacity-70 bg-transparent border-none p-0 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
      onclick={() => toggleSort('lastModified')}
      title="Sort by Date"
    >
      Last Modified <span class="text-gray-400 text-[12px]">{getSortIcon('lastModified')}</span>
    </button>
    <div role="columnheader">Type</div>
    <div class="text-right" role="columnheader">Actions</div>
  </div>

  <!-- Table Body -->
  {#if loading}
    <div class="flex-1 overflow-y-auto">
      {#each Array(5) as _, i}
        <div class="grid {gridCols} px-4 items-center h-10 border-b border-gray-100 dark:border-gray-700/30 animate-pulse">
          <div class="flex items-center justify-center"><div class="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700"></div></div>
          <div class="flex items-center gap-2.5">
            <div class="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div class="h-4 rounded bg-gray-200 dark:bg-gray-700" style="width: {120 + i * 30}px"></div>
          </div>
          <div><div class="h-4 w-14 rounded bg-gray-200 dark:bg-gray-700"></div></div>
          <div><div class="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700"></div></div>
          <div><div class="h-4 w-10 rounded bg-gray-200 dark:bg-gray-700"></div></div>
          <div><div class="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700 ml-auto"></div></div>
        </div>
      {/each}
    </div>
  {:else if sortedObjects().length === 0}
    <div class="flex flex-col items-center justify-center h-full py-20 text-gray-400 dark:text-gray-500">
      <FolderSolid class="h-16 w-16 mb-3" />
      <p class="font-semibold text-lg">This folder is empty</p>
      <p class="text-sm mt-1">Drag files here or use the upload button</p>
    </div>
  {:else if useVirtualScroll}
    <!-- Virtual Scroll Mode -->
    <div
      bind:this={scrollContainer}
      class="flex-1 overflow-y-auto"
      style="max-height: calc(100vh - 280px);"
      onscroll={handleVirtualScroll}
      data-testid="virtual-scroll-container"
    >
      <div style="height: {totalHeight}px; position: relative;">
        <div style="position: absolute; top: {offsetY}px; left: 0; right: 0;">
          {#each visibleObjects as obj, i (obj.key)}
            {@const actualIndex = virtualStart + i}
            {@const selected = isSelected(obj)}
            {@const highlighted = isHighlighted(obj)}
            {@const focused = isFocused(actualIndex)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
              data-row={obj.key}
              class="grid {gridCols} px-4 items-center border-b transition-all duration-150 active:scale-[0.995] group cursor-pointer select-none
                {selected
                  ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-800/30 relative after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-blue-500'
                  : focused
                    ? 'ring-2 ring-inset ring-blue-400 dark:ring-blue-500 bg-blue-50 dark:bg-blue-900/20 border-gray-100 dark:border-gray-700/30'
                    : 'border-gray-100 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                {highlighted ? ' animate-highlight' : ''}"
              style="height: {ROW_HEIGHT}px;"
              onclick={() => handleRowClick(obj)}
              ondblclick={() => handleRowDblClick(obj)}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(obj); } }}
              oncontextmenu={(e) => { e.preventDefault(); oncontextmenu?.(e, obj); }}
              role="row"
              tabindex="-1"
            >
              <!-- Checkbox -->
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <div class="flex items-center justify-center" role="presentation" onclick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedKeys.has(obj.key)}
                  onchange={() => toggleSelect(obj.key)}
                />
              </div>

              <!-- Name -->
              <div class="flex items-center gap-2.5 text-[13px] font-medium text-gray-900 dark:text-white min-w-0">
                {#if obj.isFolder}
                  <FolderSolid class="h-5 w-5 flex-shrink-0 text-amber-400 group-hover:scale-110 transition-transform duration-150" />
                {:else}
                  {@const iconColor = getFileIconColor(obj.name)}
                  <FileSolid class="h-5 w-5 flex-shrink-0 {iconColor} group-hover:scale-110 transition-transform duration-150" />
                {/if}
                {#if editingKey === obj.key}
                  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                  <div class="flex-1 min-w-0" onclick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      class="w-full rounded border border-blue-400 bg-white px-1.5 py-0.5 text-[13px] font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-500 dark:bg-gray-700 dark:text-white"
                      bind:value={editValue}
                      onkeydown={(e) => handleEditKeydown(e, obj)}
                      onblur={() => confirmRename(obj)}
                      use:autoFocusSelect
                    />
                  </div>
                {:else if showFullPath && !obj.isFolder}
                  <span class="truncate {selected ? 'text-blue-700 dark:text-blue-300 font-bold' : ''}">
                    <span class="text-gray-400 dark:text-gray-500">{getParentPath(obj.key)}</span><span>{obj.name}</span>
                  </span>
                {:else if obj.isFolder}
                  <span class="truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">{obj.name}</span>
                {:else}
                  <span class="truncate {selected ? 'text-blue-700 dark:text-blue-300 font-bold' : ''}">{obj.name}</span>
                {/if}
                {#if highlighted}
                  <span class="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1 rounded font-bold uppercase tracking-wider animate-pulse">New</span>
                {/if}
              </div>

              <!-- Size -->
              <div class="text-[13px] text-gray-500 dark:text-gray-400 tabular-nums">{formatSize(obj.size)}</div>

              <!-- Last Modified -->
              <div class="text-[13px] text-gray-500 dark:text-gray-400" title={formatDateFull(obj.lastModified)}>{formatDate(obj.lastModified)}</div>

              <!-- Type -->
              <div>
                {#if obj.isFolder}
                  <span class="text-[11px] text-gray-500 dark:text-gray-400">Folder</span>
                {:else}
                  {@const ext = getFileExtension(obj)}
                  {#if ext}
                    <span class="text-[11px] font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">{ext}</span>
                  {:else}
                    <span class="text-[11px] text-gray-500 dark:text-gray-400">file</span>
                  {/if}
                {/if}
              </div>

              <!-- Actions -->
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <div class="flex items-center justify-end gap-0.5 {selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-150" role="presentation" onclick={(e) => e.stopPropagation()}>
                {#if !obj.isFolder}
                  <button
                    onclick={() => ondownload(obj.key)}
                    class="rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all duration-150 active:scale-90"
                    title="Download"
                  >
                    <DownloadOutline class="h-4 w-4" />
                  </button>
                {/if}
                <button
                  onclick={() => copyPath(obj.key)}
                  class="rounded p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-all duration-150 active:scale-90"
                  title="Copy Path"
                >
                  <ClipboardOutline class="h-4 w-4" />
                </button>
                <button
                  onclick={() => ondelete([obj.key])}
                  class="rounded p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-150 active:scale-90"
                  title="Delete"
                >
                  <TrashBinOutline class="h-4 w-4" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <!-- Standard Mode (no virtual scroll) -->
    <div class="flex-1 overflow-y-auto" bind:this={bodyEl}>
      {#each sortedObjects() as obj, i (obj.key)}
        {@const selected = isSelected(obj)}
        {@const highlighted = isHighlighted(obj)}
        {@const focused = isFocused(i)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          data-row={obj.key}
          class="grid {gridCols} px-4 items-center h-10 border-b transition-all duration-150 active:scale-[0.995] group cursor-pointer select-none
            {selected
              ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-800/30 relative after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-blue-500'
              : focused
                ? 'ring-2 ring-inset ring-blue-400 dark:ring-blue-500 bg-blue-50 dark:bg-blue-900/20 border-gray-100 dark:border-gray-700/30'
                : 'border-gray-100 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/50'}
            {highlighted ? ' animate-highlight' : ''}"
          onclick={() => handleRowClick(obj)}
          ondblclick={() => handleRowDblClick(obj)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(obj); } }}
          oncontextmenu={(e) => { e.preventDefault(); oncontextmenu?.(e, obj); }}
          role="row"
          tabindex="-1"
        >
          <!-- Checkbox -->
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div class="flex items-center justify-center" role="presentation" onclick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedKeys.has(obj.key)}
              onchange={() => toggleSelect(obj.key)}
            />
          </div>

          <!-- Name -->
          <div class="flex items-center gap-2.5 text-[13px] font-medium text-gray-900 dark:text-white min-w-0">
            {#if obj.isFolder}
              <FolderSolid class="h-5 w-5 flex-shrink-0 text-amber-400 group-hover:scale-110 transition-transform duration-150" />
            {:else}
              {@const iconColor = getFileIconColor(obj.name)}
              <FileSolid class="h-5 w-5 flex-shrink-0 {iconColor} group-hover:scale-110 transition-transform duration-150" />
            {/if}
            {#if editingKey === obj.key}
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <div class="flex-1 min-w-0" onclick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  class="w-full rounded border border-blue-400 bg-white px-1.5 py-0.5 text-[13px] font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-500 dark:bg-gray-700 dark:text-white"
                  bind:value={editValue}
                  onkeydown={(e) => handleEditKeydown(e, obj)}
                  onblur={() => confirmRename(obj)}
                  use:autoFocusSelect
                />
              </div>
            {:else if showFullPath && !obj.isFolder}
              <span class="truncate {selected ? 'text-blue-700 dark:text-blue-300 font-bold' : ''}">
                <span class="text-gray-400 dark:text-gray-500">{getParentPath(obj.key)}</span><span>{obj.name}</span>
              </span>
            {:else if obj.isFolder}
              <span class="truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">{obj.name}</span>
            {:else}
              <span class="truncate {selected ? 'text-blue-700 dark:text-blue-300 font-bold' : ''}">{obj.name}</span>
            {/if}
            {#if highlighted}
              <span class="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1 rounded font-bold uppercase tracking-wider animate-pulse">New</span>
            {/if}
          </div>

          <!-- Size -->
          <div class="text-[13px] text-gray-500 dark:text-gray-400 tabular-nums">{formatSize(obj.size)}</div>

          <!-- Last Modified -->
          <div class="text-[13px] text-gray-500 dark:text-gray-400" title={formatDateFull(obj.lastModified)}>{formatDate(obj.lastModified)}</div>

          <!-- Type -->
          <div>
            {#if obj.isFolder}
              <span class="text-[11px] text-gray-500 dark:text-gray-400">Folder</span>
            {:else}
              {@const ext = getFileExtension(obj)}
              {#if ext}
                <span class="text-[11px] font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">{ext}</span>
              {:else}
                <span class="text-[11px] text-gray-500 dark:text-gray-400">file</span>
              {/if}
            {/if}
          </div>

          <!-- Actions -->
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div class="flex items-center justify-end gap-0.5 {selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-150" role="presentation" onclick={(e) => e.stopPropagation()}>
            {#if !obj.isFolder}
              <button
                onclick={() => ondownload(obj.key)}
                class="rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all duration-150 active:scale-90"
                title="Download"
              >
                <DownloadOutline class="h-4 w-4" />
              </button>
            {/if}
            <button
              onclick={() => copyPath(obj.key)}
              class="rounded p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-all duration-150 active:scale-90"
              title="Copy Path"
            >
              <ClipboardOutline class="h-4 w-4" />
            </button>
            <button
              onclick={() => ondelete([obj.key])}
              class="rounded p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-150 active:scale-90"
              title="Delete"
            >
              <TrashBinOutline class="h-4 w-4" />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
