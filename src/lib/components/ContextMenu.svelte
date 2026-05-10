<script lang="ts">
  import { DownloadOutline, ClipboardOutline, LinkOutline, TrashBinOutline, EyeOutline, EditOutline, FileCopyOutline, ArrowRightOutline } from 'flowbite-svelte-icons';
  import { addToast } from '$lib/components/Toast.svelte';

  let {
    x = 0,
    y = 0,
    visible = $bindable(false),
    objectKey = '',
    objectName = '',
    isFolder = false,
    ondownload,
    onshare,
    ondelete,
    onpreview,
    onrename,
    oncopy,
    onmove,
  }: {
    x?: number;
    y?: number;
    visible?: boolean;
    objectKey?: string;
    objectName?: string;
    isFolder?: boolean;
    ondownload: (key: string) => void;
    onshare: (key: string) => void;
    ondelete: (keys: string[]) => void;
    onpreview: (key: string) => void;
    onrename?: (key: string) => void;
    oncopy?: (key: string) => void;
    onmove?: (key: string) => void;
  } = $props();

  function handleAction(action: () => void) {
    action();
    visible = false;
  }

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(objectKey);
      addToast('Path copied to clipboard', 'success');
    } catch {
      const input = document.createElement('input');
      input.value = objectKey;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      addToast('Path copied to clipboard', 'success');
    }
    visible = false;
  }

  // Close on click outside
  function handleWindowClick() {
    if (visible) visible = false;
  }

  // Adjust position to stay within viewport
  let adjustedX = $derived(Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 200));
  let adjustedY = $derived(Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 250));
</script>

<svelte:window onclick={handleWindowClick} />

{#if visible}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed z-50 min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700"
    style="left: {adjustedX}px; top: {adjustedY}px;"
    role="menu"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => { if (e.key === 'Escape') visible = false; }}
  >
    {#if !isFolder}
      <button
        class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
        onclick={() => handleAction(() => onpreview(objectKey))}
        role="menuitem"
      >
        <EyeOutline class="h-4 w-4 text-gray-400" />
        View details
      </button>

      <button
        class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
        onclick={() => handleAction(() => ondownload(objectKey))}
        role="menuitem"
      >
        <DownloadOutline class="h-4 w-4 text-gray-400" />
        Download
      </button>
    {/if}

    <button
      class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
      onclick={copyPath}
      role="menuitem"
    >
      <ClipboardOutline class="h-4 w-4 text-gray-400" />
      Copy path
    </button>

    <button
      class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
      onclick={() => handleAction(() => onrename?.(objectKey))}
      role="menuitem"
    >
      <EditOutline class="h-4 w-4 text-gray-400" />
      Rename
    </button>

    <button
      class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
      onclick={() => handleAction(() => oncopy?.(objectKey))}
      role="menuitem"
    >
      <FileCopyOutline class="h-4 w-4 text-gray-400" />
      Copy to...
    </button>

    <button
      class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
      onclick={() => handleAction(() => onmove?.(objectKey))}
      role="menuitem"
    >
      <ArrowRightOutline class="h-4 w-4 text-gray-400" />
      Move to...
    </button>

    {#if !isFolder}
      <button
        class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
        onclick={() => handleAction(() => onshare(objectKey))}
        role="menuitem"
      >
        <LinkOutline class="h-4 w-4 text-gray-400" />
        Share link
      </button>
    {/if}

    <div class="my-1 border-t border-gray-200 dark:border-gray-600"></div>

    <button
      class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
      onclick={() => handleAction(() => ondelete([objectKey]))}
      role="menuitem"
    >
      <TrashBinOutline class="h-4 w-4" />
      Delete
    </button>
  </div>
{/if}
