<script lang="ts">
  import { Modal, Button } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

  let {
    open = $bindable(false),
    bucketName,
    onconfirm,
  }: {
    open: boolean;
    bucketName: string;
    onconfirm: () => void;
  } = $props();

  let confirmInput = $state('');

  let isConfirmed = $derived(confirmInput === bucketName);

  function handleConfirm() {
    if (!isConfirmed) return;
    onconfirm();
    confirmInput = '';
    open = false;
  }

  function handleCancel() {
    confirmInput = '';
    open = false;
  }
</script>

<Modal bind:open size="sm" title="Delete Bucket">
  <div class="text-center">
    <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
      <ExclamationCircleOutline class="h-8 w-8 text-red-500 dark:text-red-400" />
    </div>
    <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
      Delete Bucket
    </h3>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      This will permanently delete the bucket <strong class="text-gray-900 dark:text-white">{bucketName}</strong> and all its contents. This action cannot be undone.
    </p>

    <div class="mt-4 text-left">
      <label for="confirmBucketName" class="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        Type the bucket name to confirm:
      </label>
      <input
        id="confirmBucketName"
        type="text"
        placeholder={bucketName}
        bind:value={confirmInput}
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-red-500 dark:focus:ring-red-500"
      />
    </div>
  </div>

  {#snippet footer()}
    <div class="flex w-full justify-center gap-3">
      <Button color="alternative" onclick={handleCancel}>Cancel</Button>
      <Button color="red" onclick={handleConfirm} disabled={!isConfirmed}>
        Delete Bucket
      </Button>
    </div>
  {/snippet}
</Modal>
