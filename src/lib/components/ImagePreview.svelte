<script lang="ts">
  let {
    url,
    alt = 'Preview',
  }: {
    url: string;
    alt?: string;
  } = $props();

  let loaded = $state(false);
  let error = $state(false);
</script>

<div class="flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden min-h-[120px]">
  {#if error}
    <div class="flex flex-col items-center gap-2 p-4 text-center">
      <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 003.75 21z" />
      </svg>
      <p class="text-xs text-gray-500 dark:text-gray-400">Failed to load image</p>
    </div>
  {:else}
    {#if !loaded}
      <div class="flex items-center justify-center p-8">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600"></div>
      </div>
    {/if}
    <img
      src={url}
      {alt}
      class="max-w-full max-h-[300px] object-contain {loaded ? '' : 'hidden'}"
      onload={() => { loaded = true; }}
      onerror={() => { error = true; }}
    />
  {/if}
</div>
