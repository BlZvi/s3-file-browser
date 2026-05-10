<script lang="ts">
  import { onMount } from 'svelte';
  import Spinner from './Spinner.svelte';

  let {
    url,
    contentType = 'text/plain',
  }: {
    url: string;
    contentType?: string;
  } = $props();

  let content = $state('');
  let loading = $state(true);
  let error = $state('');
  let truncated = $state(false);

  const MAX_SIZE = 100_000; // 100KB max preview

  onMount(async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      if (text.length > MAX_SIZE) {
        content = text.slice(0, MAX_SIZE);
        truncated = true;
      } else {
        content = text;
      }
    } catch (err: any) {
      if (err instanceof TypeError) {
        error = 'Unable to load preview — the file may be on an external server';
      } else {
        error = err.message || 'Failed to load content';
      }
    } finally {
      loading = false;
    }
  });

  let isJson = $derived(
    contentType.includes('json') || url.endsWith('.json')
  );

  let formattedContent = $derived(() => {
    if (isJson && content) {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        return content;
      }
    }
    return content;
  });
</script>

<div class="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
  {#if loading}
    <div class="flex items-center justify-center p-8">
      <Spinner size="md" color="primary" />
    </div>
  {:else if error}
    <div class="flex flex-col items-center gap-2 p-4 text-center">
      <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <p class="text-xs text-gray-500 dark:text-gray-400">{error}</p>
    </div>
  {:else}
    <div class="max-h-[300px] overflow-auto">
      <pre class="p-3 text-xs leading-relaxed font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all">{formattedContent()}</pre>
    </div>
    {#if truncated}
      <div class="border-t border-gray-200 dark:border-gray-700 px-3 py-2 text-center">
        <span class="text-xs text-gray-400 dark:text-gray-500">Content truncated — download for full file</span>
      </div>
    {/if}
  {/if}
</div>
