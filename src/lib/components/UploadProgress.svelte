<script lang="ts">
  import Spinner from '$lib/components/Spinner.svelte';

  export interface UploadFileStatus {
    name: string;
    status: 'pending' | 'uploading' | 'done' | 'error';
    progress?: number;
  }

  let {
    files,
    bucket,
    prefix,
    visible = $bindable(false),
    onretry,
    oncomplete,
  }: {
    files: UploadFileStatus[];
    bucket: string;
    prefix: string;
    visible: boolean;
    onretry?: () => void;
    oncomplete?: (uploadedKeys: string[]) => void;
  } = $props();

  let autoDismissTimer: ReturnType<typeof setTimeout> | undefined = $state();

  // Derived states
  let totalFiles = $derived(files.length);
  let doneFiles = $derived(files.filter((f) => f.status === 'done').length);
  let errorFiles = $derived(files.filter((f) => f.status === 'error').length);
  let currentFile = $derived(files.find((f) => f.status === 'uploading'));
  let isUploading = $derived(files.some((f) => f.status === 'uploading' || f.status === 'pending'));
  let allDone = $derived(totalFiles > 0 && !isUploading);
  let hasErrors = $derived(errorFiles > 0);
  let allSuccess = $derived(allDone && !hasErrors);

  // Overall progress percentage
  let overallProgress = $derived(() => {
    if (totalFiles === 0) return 0;
    let total = 0;
    for (const f of files) {
      if (f.status === 'done') total += 100;
      else if (f.status === 'uploading') total += (f.progress ?? 0);
      else if (f.status === 'error') total += 0;
    }
    return Math.round(total / totalFiles);
  });

  // Auto-dismiss on success
  $effect(() => {
    if (allSuccess && visible) {
      autoDismissTimer = setTimeout(() => {
        dismiss();
      }, 5000);
    }
    return () => {
      if (autoDismissTimer) clearTimeout(autoDismissTimer);
    };
  });

  function dismiss() {
    visible = false;
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = undefined;
    }
    if (allDone) {
      const uploadedKeys = files
        .filter((f) => f.status === 'done')
        .map((f) => prefix + f.name);
      oncomplete?.(uploadedKeys);
    }
  }

  function handleRetry() {
    onretry?.();
  }
</script>

{#if visible && totalFiles > 0}
  <div
    class="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 min-w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-blue-200/50 bg-white shadow-2xl dark:border-blue-800/30 dark:bg-gray-800 hover:-translate-y-1 transition-transform animate-slide-up"
  >
    {#if isUploading}
      <!-- Uploading state -->
      <div class="flex items-center gap-4 px-5 py-3">
        <div class="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-full flex-shrink-0">
          <Spinner size="sm" color="primary" />
        </div>
        <div class="flex-1 min-w-0 flex flex-col gap-1.5">
          <div class="flex justify-between items-center">
            <span class="text-sm font-bold text-gray-900 dark:text-white">
              Uploading {totalFiles} file{totalFiles !== 1 ? 's' : ''}...
            </span>
            <span class="font-mono text-[11px] text-gray-500 dark:text-gray-400">{overallProgress()}%</span>
          </div>
          <!-- Progress bar -->
          <div class="w-full bg-gray-200 dark:bg-gray-600 h-1.5 rounded-full overflow-hidden">
            <div class="bg-blue-600 h-full rounded-full transition-all duration-300" style="width: {overallProgress()}%"></div>
          </div>
          {#if currentFile}
            <span class="text-[11px] text-gray-500 dark:text-gray-400 truncate">{currentFile.name}</span>
          {/if}
        </div>
        <!-- Close button -->
        <button onclick={dismiss} aria-label="Dismiss" class="text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors flex-shrink-0">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {:else if allSuccess}
      <!-- Success state -->
      <div class="flex items-center gap-4 px-5 py-3">
        <!-- Check icon in blue tinted circle -->
        <div class="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-full flex-shrink-0">
          <svg class="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="flex-1 min-w-0 flex flex-col">
          <span class="text-sm font-bold text-gray-900 dark:text-white">
            {totalFiles} file{totalFiles !== 1 ? 's' : ''} uploaded successfully
          </span>
          <span class="text-[11px] text-gray-500 dark:text-gray-400">
            Added to /{prefix || '(root)'}
          </span>
        </div>
        <button
          onclick={dismiss}
          class="text-blue-600 dark:text-blue-400 text-[12px] font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded transition-colors flex-shrink-0"
        >
          Dismiss
        </button>
      </div>
    {:else if hasErrors}
      <!-- Error state -->
      <div class="flex items-center gap-4 px-5 py-3">
        <!-- Error icon in red tinted circle -->
        <div class="bg-red-50 dark:bg-red-900/20 p-2 rounded-full flex-shrink-0">
          <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div class="flex-1 min-w-0 flex flex-col">
          <span class="text-sm font-bold text-gray-900 dark:text-white">Upload failed</span>
          <span class="text-[11px] text-gray-500 dark:text-gray-400">
            {errorFiles} file{errorFiles !== 1 ? 's' : ''} failed{doneFiles > 0 ? `, ${doneFiles} succeeded` : ''}
          </span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            onclick={handleRetry}
            class="text-red-600 dark:text-red-400 text-[12px] font-bold hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded transition-colors"
          >
            Retry
          </button>
          <button
            onclick={dismiss}
            class="text-gray-500 dark:text-gray-400 text-[12px] font-medium hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(1rem);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
</style>
