<script lang="ts">
  import {
    getTransfers,
    getIsExpanded,
    setExpanded,
    cancelTransfer,
    clearCompleted,
    removeTransfer,
    getActiveTransfers,
    getCompletedTransfers,
    formatBytes,
    formatTime,
    type Transfer,
  } from '$lib/stores/transfers.svelte';
  import {
    ArrowUpOutline,
    ArrowDownOutline,
    CloseOutline,
    ChevronUpOutline,
    ChevronDownOutline,
    TrashBinOutline,
    RefreshOutline,
  } from 'flowbite-svelte-icons';

  let activeTab = $state<'active' | 'history'>('active');

  let transfers = $derived(getTransfers());
  let isExpanded = $derived(getIsExpanded());
  let activeTransfers = $derived(getActiveTransfers());
  let completedTransfers = $derived(getCompletedTransfers());
  let hasTransfers = $derived(transfers.length > 0);

  // Auto-switch to active tab when new active transfers appear
  $effect(() => {
    if (activeTransfers.length > 0) {
      activeTab = 'active';
    }
  });

  function toggleExpanded() {
    setExpanded(!isExpanded);
  }

  function handleClearCompleted() {
    clearCompleted();
  }

  function handleCancel(id: string) {
    cancelTransfer(id);
  }

  function handleRemove(id: string) {
    removeTransfer(id);
  }

  function getProgressBarColor(status: Transfer['status']): string {
    switch (status) {
      case 'active':
        return 'bg-blue-600 dark:bg-blue-500';
      case 'completed':
        return 'bg-green-500 dark:bg-green-400';
      case 'failed':
        return 'bg-red-500 dark:bg-red-400';
      case 'cancelled':
        return 'bg-gray-400 dark:bg-gray-500';
      default:
        return 'bg-gray-300 dark:bg-gray-600';
    }
  }

  function getStatusText(transfer: Transfer): string {
    switch (transfer.status) {
      case 'pending':
        return 'Pending';
      case 'active':
        return `${transfer.progress}%`;
      case 'completed':
        return 'Done';
      case 'failed':
        return `Failed${transfer.error ? ': ' + transfer.error : ''}`;
      case 'cancelled':
        return 'Cancelled';
      default:
        return '';
    }
  }

  function truncateFileName(name: string, maxLen: number = 30): string {
    if (name.length <= maxLen) return name;
    const ext = name.lastIndexOf('.');
    if (ext > 0 && name.length - ext <= 6) {
      const extStr = name.slice(ext);
      const base = name.slice(0, maxLen - extStr.length - 3);
      return base + '...' + extStr;
    }
    return name.slice(0, maxLen - 3) + '...';
  }

  let displayedTransfers = $derived(
    activeTab === 'active' ? activeTransfers : completedTransfers
  );
</script>

{#if hasTransfers}
  <div
    data-testid="transfer-manager"
    class="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 transition-all duration-200"
  >
    <!-- Header bar -->
    <button
      data-testid="transfer-header"
      class="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-750 cursor-pointer select-none"
      onclick={toggleExpanded}
      type="button"
    >
      <div class="flex items-center gap-2">
        {#if isExpanded}
          <ChevronDownOutline class="h-4 w-4" />
        {:else}
          <ChevronUpOutline class="h-4 w-4" />
        {/if}
        <span>
          Transfers
          {#if activeTransfers.length > 0}
            <span class="text-blue-600 dark:text-blue-400">({activeTransfers.length} active)</span>
          {/if}
          {#if completedTransfers.length > 0}
            <span class="text-gray-500 dark:text-gray-400">
              {activeTransfers.length > 0 ? ', ' : '('}{completedTransfers.length} completed{activeTransfers.length > 0 ? '' : ')'}
            </span>
          {/if}
        </span>
      </div>

      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="flex items-center gap-2" onclick={(e: MouseEvent) => e.stopPropagation()}>
        {#if completedTransfers.length > 0}
          <button
            data-testid="transfer-clear"
            class="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
            onclick={handleClearCompleted}
            type="button"
          >
            Clear
          </button>
        {/if}
      </div>
    </button>

    <!-- Expanded content -->
    {#if isExpanded}
      <div class="border-t border-gray-100 dark:border-gray-700">
        <!-- Tabs -->
        <div class="flex border-b border-gray-100 px-4 dark:border-gray-700">
          <button
            class="px-3 py-1.5 text-xs font-medium transition-colors {activeTab === 'active'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
            onclick={() => { activeTab = 'active'; }}
            type="button"
          >
            Active ({activeTransfers.length})
          </button>
          <button
            class="px-3 py-1.5 text-xs font-medium transition-colors {activeTab === 'history'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
            onclick={() => { activeTab = 'history'; }}
            type="button"
          >
            History ({completedTransfers.length})
          </button>
        </div>

        <!-- Transfer list -->
        <div class="max-h-64 overflow-y-auto">
          {#if displayedTransfers.length === 0}
            <div class="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
              {activeTab === 'active' ? 'No active transfers' : 'No transfer history'}
            </div>
          {:else}
            {#each displayedTransfers as transfer (transfer.id)}
              <div
                data-testid="transfer-row"
                class="flex flex-col gap-1 border-b border-gray-50 px-4 py-2 last:border-b-0 dark:border-gray-700/50"
              >
                <!-- Row 1: Icon, filename, status, actions -->
                <div class="flex items-center gap-2">
                  <!-- Type icon -->
                  <div class="flex-shrink-0">
                    {#if transfer.type === 'upload'}
                      <ArrowUpOutline class="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                    {:else}
                      <ArrowDownOutline class="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
                    {/if}
                  </div>

                  <!-- File name -->
                  <span
                    class="min-w-0 flex-1 truncate text-xs font-medium text-gray-800 dark:text-gray-200"
                    title={transfer.fileName}
                  >
                    {truncateFileName(transfer.fileName)}
                  </span>

                  <!-- Status text -->
                  <span class="flex-shrink-0 text-xs {
                    transfer.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                    transfer.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                    transfer.status === 'cancelled' ? 'text-gray-500 dark:text-gray-400' :
                    'text-blue-600 dark:text-blue-400'
                  }">
                    {getStatusText(transfer)}
                  </span>

                  <!-- Speed (active only) -->
                  {#if transfer.status === 'active' && transfer.speed > 0}
                    <span class="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                      {formatBytes(transfer.speed)}/s
                    </span>
                  {/if}

                  <!-- ETA (active only) -->
                  {#if transfer.status === 'active' && transfer.estimatedTimeRemaining > 0}
                    <span class="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                      {formatTime(transfer.estimatedTimeRemaining)}
                    </span>
                  {/if}

                  <!-- Action buttons -->
                  <div class="flex flex-shrink-0 items-center gap-1">
                    {#if transfer.status === 'active' || transfer.status === 'pending'}
                      <button
                        data-testid="transfer-cancel"
                        class="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                        onclick={() => handleCancel(transfer.id)}
                        title="Cancel transfer"
                        type="button"
                      >
                        <CloseOutline class="h-3.5 w-3.5" />
                      </button>
                    {:else if transfer.status === 'failed'}
                      <button
                        class="rounded p-0.5 text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                        title="Retry"
                        type="button"
                      >
                        <RefreshOutline class="h-3.5 w-3.5" />
                      </button>
                      <button
                        class="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                        onclick={() => handleRemove(transfer.id)}
                        title="Remove"
                        type="button"
                      >
                        <TrashBinOutline class="h-3.5 w-3.5" />
                      </button>
                    {:else}
                      <button
                        class="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                        onclick={() => handleRemove(transfer.id)}
                        title="Remove"
                        type="button"
                      >
                        <TrashBinOutline class="h-3.5 w-3.5" />
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- Row 2: Progress bar + size info (for active/pending transfers) -->
                {#if transfer.status === 'active' || transfer.status === 'pending'}
                  <div class="flex items-center gap-2">
                    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                      <div
                        class="h-full rounded-full transition-all duration-300 {getProgressBarColor(transfer.status)}"
                        style="width: {transfer.progress}%"
                      ></div>
                    </div>
                    <span class="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                      {formatBytes(transfer.bytesTransferred)}{#if transfer.fileSize > 0} / {formatBytes(transfer.fileSize)}{/if}
                    </span>
                  </div>
                {:else if transfer.status === 'completed' || transfer.status === 'failed' || transfer.status === 'cancelled'}
                  <!-- Completed progress bar -->
                  <div class="flex items-center gap-2">
                    <div class="h-1 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                      <div
                        class="h-full rounded-full {getProgressBarColor(transfer.status)}"
                        style="width: {transfer.status === 'completed' ? 100 : transfer.progress}%"
                      ></div>
                    </div>
                    {#if transfer.fileSize > 0}
                      <span class="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                        {formatBytes(transfer.fileSize)}
                      </span>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}
