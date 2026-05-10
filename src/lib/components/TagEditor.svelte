<script lang="ts">
  import { addToast } from '$lib/components/Toast.svelte';

  let {
    tags = $bindable({}),
    readonly = false,
    maxTags = 10,
    onsave,
  }: {
    tags: Record<string, string>;
    readonly?: boolean;
    maxTags?: number;
    onsave?: (tags: Record<string, string>) => void;
  } = $props();

  // Internal editable list of tag entries
  let entries = $state<{ key: string; value: string }[]>([]);
  let originalSnapshot = $state('');
  let saving = $state(false);

  // Sync entries from external tags prop when it changes
  $effect(() => {
    const incoming = Object.entries(tags).map(([key, value]) => ({ key, value }));
    entries = incoming;
    originalSnapshot = JSON.stringify(tags);
  });

  let tagCount = $derived(entries.length);
  let atMax = $derived(tagCount >= maxTags);

  let isDirty = $derived(() => {
    const current: Record<string, string> = {};
    for (const e of entries) {
      if (e.key.trim()) current[e.key.trim()] = e.value;
    }
    return JSON.stringify(current) !== originalSnapshot;
  });

  function addTag() {
    if (atMax) return;
    entries = [...entries, { key: '', value: '' }];
  }

  function removeTag(index: number) {
    entries = entries.filter((_, i) => i !== index);
  }

  function updateKey(index: number, value: string) {
    entries = entries.map((e, i) => (i === index ? { ...e, key: value } : e));
  }

  function updateValue(index: number, value: string) {
    entries = entries.map((e, i) => (i === index ? { ...e, value: value } : e));
  }

  async function handleSave() {
    // Build the tags record, filtering out empty keys
    const result: Record<string, string> = {};
    for (const e of entries) {
      const k = e.key.trim();
      if (k) result[k] = e.value;
    }

    // Check for duplicate keys
    const keys = entries.map((e) => e.key.trim()).filter(Boolean);
    if (new Set(keys).size !== keys.length) {
      addToast('Duplicate tag keys are not allowed', 'warning');
      return;
    }

    saving = true;
    try {
      if (onsave) {
        await onsave(result);
      }
      tags = result;
      originalSnapshot = JSON.stringify(result);
    } catch (err: any) {
      // Error handling is done by the parent via onsave
    } finally {
      saving = false;
    }
  }
</script>

<div class="flex flex-col gap-2">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-1.5">
      <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tags</span>
      <span class="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300 min-w-[18px]">
        {tagCount}
      </span>
    </div>
    {#if !readonly && !atMax}
      <button
        onclick={addTag}
        class="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Tag
      </button>
    {/if}
  </div>

  <!-- Tag entries -->
  {#if entries.length === 0}
    <div class="text-[11px] text-gray-400 dark:text-gray-500 italic py-2 text-center">
      No tags
    </div>
  {:else}
    <div class="flex flex-col gap-1.5">
      {#each entries as entry, i}
        <div class="flex items-center gap-1.5">
          {#if readonly}
            <span class="flex-1 font-mono text-[11px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 truncate">
              {entry.key}
            </span>
            <span class="text-gray-400 dark:text-gray-500 text-[11px]">=</span>
            <span class="flex-1 font-mono text-[11px] text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 truncate">
              {entry.value}
            </span>
          {:else}
            <input
              type="text"
              value={entry.key}
              oninput={(e) => updateKey(i, e.currentTarget.value)}
              placeholder="Key"
              class="flex-1 min-w-0 font-mono text-[11px] text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <span class="text-gray-400 dark:text-gray-500 text-[11px]">=</span>
            <input
              type="text"
              value={entry.value}
              oninput={(e) => updateValue(i, e.currentTarget.value)}
              placeholder="Value"
              class="flex-1 min-w-0 font-mono text-[11px] text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button
              onclick={() => removeTag(i)}
              class="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors shrink-0"
              title="Remove tag"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Max tags hint -->
  {#if !readonly && atMax}
    <p class="text-[10px] text-amber-600 dark:text-amber-400">Maximum of {maxTags} tags reached</p>
  {/if}

  <!-- Save button -->
  {#if !readonly && isDirty()}
    <button
      onclick={handleSave}
      disabled={saving}
      class="mt-1 w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors"
    >
      {#if saving}
        <svg class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Saving…
      {:else}
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        Save Tags
      {/if}
    </button>
  {/if}
</div>
