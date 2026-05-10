<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    bucket = '',
    prefix = '',
    ondrop,
    children,
  }: {
    bucket?: string;
    prefix?: string;
    ondrop: (files: File[]) => void;
    children: Snippet;
  } = $props();

  let dragOver = $state(false);
  let dragCounter = $state(0);

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    dragCounter++;
    if (e.dataTransfer?.types.includes('Files')) {
      dragOver = true;
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragOver = false;
      dragCounter = 0;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    dragCounter = 0;

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      ondrop(Array.from(e.dataTransfer.files));
    }
  }
</script>

<div
  class="relative flex-1 overflow-auto"
  ondragenter={handleDragEnter}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role="region"
  aria-label="File drop zone"
>
  <!-- Overlay shown during drag -->
  {#if dragOver}
    <div class="absolute inset-0 z-30 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border-4 border-dashed border-blue-500 dark:border-blue-400 rounded-lg pointer-events-none">
      <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl flex flex-col items-center border border-blue-200/50 dark:border-blue-700/50">
        <svg class="h-14 w-14 text-blue-500 dark:text-blue-400 mb-3 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p class="text-xl font-bold text-gray-900 dark:text-white">
          Drop files to upload to <span class="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">{prefix || '/'}</span>
        </p>
      </div>
    </div>
  {/if}

  {@render children()}
</div>
