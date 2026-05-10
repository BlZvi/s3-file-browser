<script lang="ts">
  import { Modal, Button, Label, Input } from 'flowbite-svelte';
  import { addToast } from '$lib/components/Toast.svelte';

  let {
    open = $bindable(false),
    bucket,
    prefix,
    oncreated,
  }: {
    open: boolean;
    bucket: string;
    prefix: string;
    oncreated: () => void;
  } = $props();

  let folderName = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!folderName.trim()) return;

    loading = true;
    error = '';

    try {
      const key = prefix + folderName.trim();
      const res = await fetch('/api/s3/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket, key }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create folder');
      }

      addToast(`Folder "${folderName.trim()}" created successfully`, 'success');
      folderName = '';
      open = false;
      oncreated();
    } catch (err: any) {
      error = err.message;
      addToast(err.message, 'error');
    } finally {
      loading = false;
    }
  }
</script>

<Modal title="Create Folder" bind:open size="sm">
  <form onsubmit={handleCreate}>
    <div class="mb-4">
      <Label for="folderName" class="mb-2">Folder Name</Label>
      <Input
        id="folderName"
        type="text"
        placeholder="new-folder"
        required
        bind:value={folderName}
      />
      {#if error}
        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      {/if}
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Will be created at: {bucket}/{prefix}{folderName || '...'}/
      </p>
    </div>
  </form>

  {#snippet footer()}
    <div class="flex w-full justify-end gap-2">
      <Button color="alternative" onclick={() => { open = false; folderName = ''; error = ''; }}>
        Cancel
      </Button>
      <Button onclick={handleCreate} disabled={loading || !folderName.trim()} class="bg-primary-600 hover:bg-primary-700 text-white">
        {loading ? 'Creating...' : 'Create'}
      </Button>
    </div>
  {/snippet}
</Modal>
