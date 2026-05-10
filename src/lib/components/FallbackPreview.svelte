<script lang="ts">
  import { FileSolid } from 'flowbite-svelte-icons';

  let {
    contentType = 'unknown',
    fileName = '',
  }: {
    contentType?: string;
    fileName?: string;
  } = $props();
</script>

<div class="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-6 dark:bg-gray-900 min-h-[120px]">
  <div class="mb-3 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
    <FileSolid class="h-8 w-8 text-gray-400 dark:text-gray-500" />
  </div>
  <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Preview not available</p>
  <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{contentType}</p>
</div>
