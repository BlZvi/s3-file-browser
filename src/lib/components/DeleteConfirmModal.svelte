<script lang="ts">
  import { Modal, Button } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
  import { addToast } from '$lib/components/Toast.svelte';

  let {
    open = $bindable(false),
    keys,
    bucket,
    onconfirm,
  }: {
    open: boolean;
    keys: string[];
    bucket: string;
    onconfirm: () => void;
  } = $props();

  let loading = $state(false);

  async function handleDelete() {
    loading = true;
    try {
      const res = await fetch('/api/s3/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket, keys }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      addToast(`${keys.length} item${keys.length !== 1 ? 's' : ''} deleted successfully`, 'success');
      open = false;
      onconfirm();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      loading = false;
    }
  }
</script>

<Modal bind:open size="sm" title="Confirm Delete">
  <div class="text-center">
    <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
      <ExclamationCircleOutline class="h-8 w-8 text-red-500 dark:text-red-400" />
    </div>
    <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
      Delete {keys.length} item{keys.length !== 1 ? 's' : ''}?
    </h3>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      This action cannot be undone.
    </p>
    {#if keys.length <= 5}
      <ul class="mt-3 space-y-1 text-left text-sm text-gray-600 dark:text-gray-400">
        {#each keys as key}
          <li class="truncate rounded-md bg-gray-50 px-3 py-1.5 dark:bg-gray-700/50">• {key}</li>
        {/each}
      </ul>
    {:else}
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Including: {keys[0]}, {keys[1]}, and {keys.length - 2} more...
      </p>
    {/if}
  </div>

  {#snippet footer()}
    <div class="flex w-full justify-center gap-3">
      <Button color="alternative" onclick={() => { open = false; }}>Cancel</Button>
      <Button color="red" onclick={handleDelete} disabled={loading}>
        {loading ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  {/snippet}
</Modal>
