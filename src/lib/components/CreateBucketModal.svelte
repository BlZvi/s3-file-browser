<script lang="ts">
  import { Modal, Button } from 'flowbite-svelte';

  let {
    open = $bindable(false),
    oncreate,
  }: {
    open: boolean;
    oncreate: (name: string, options: { versioning: boolean; objectLocking: boolean }) => void;
  } = $props();

  let bucketName = $state('');
  let versioning = $state(false);
  let objectLocking = $state(false);
  let showRules = $state(false);
  let touched = $state(false);

  const BUCKET_NAME_REGEX = /^[a-z0-9][a-z0-9.\-]{1,61}[a-z0-9]$/;
  const CONSECUTIVE_PERIODS = /\.\./;

  let validationError = $derived(() => {
    if (!touched || !bucketName) return '';
    if (bucketName.length < 3) return 'Bucket name must be at least 3 characters';
    if (bucketName.length > 63) return 'Bucket name must be at most 63 characters';
    if (/[A-Z]/.test(bucketName)) return 'Bucket name must be lowercase';
    if (CONSECUTIVE_PERIODS.test(bucketName)) return 'Bucket name cannot contain consecutive periods';
    if (!BUCKET_NAME_REGEX.test(bucketName)) return 'Bucket name must start and end with a letter or number, and contain only lowercase letters, numbers, hyphens, and periods';
    return '';
  });

  let isValid = $derived(bucketName.length >= 3 && !validationError());

  function handleObjectLockingToggle() {
    objectLocking = !objectLocking;
    if (objectLocking) {
      versioning = true;
    }
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    touched = true;
    if (!isValid) return;
    oncreate(bucketName, { versioning, objectLocking });
    resetForm();
  }

  function resetForm() {
    bucketName = '';
    versioning = false;
    objectLocking = false;
    showRules = false;
    touched = false;
  }

  function handleCancel() {
    open = false;
    resetForm();
  }
</script>

<Modal title="Create Bucket" bind:open size="lg">
  <form onsubmit={handleSubmit}>
    <!-- Bucket Name -->
    <div class="mb-5">
      <label for="bucketName" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
        Bucket Name
      </label>
      <input
        id="bucketName"
        type="text"
        placeholder="my-bucket-name"
        bind:value={bucketName}
        oninput={() => { touched = true; }}
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      />
      {#if validationError()}
        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{validationError()}</p>
      {/if}

      <button
        type="button"
        class="mt-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline"
        onclick={() => showRules = !showRules}
      >
        {showRules ? 'Hide' : 'View'} Bucket Naming Rules
      </button>

      {#if showRules}
        <div class="mt-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <p>• Must be between 3 and 63 characters long</p>
          <p>• Can only contain lowercase letters, numbers, hyphens (-), and periods (.)</p>
          <p>• Must start and end with a letter or number</p>
          <p>• Cannot contain consecutive periods (..)</p>
          <p>• Cannot be formatted as an IP address (e.g., 192.168.1.1)</p>
        </div>
      {/if}
    </div>

    <!-- Features Section -->
    <div class="mb-4">
      <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Features</h4>

      <!-- Versioning Toggle -->
      <div class="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700">
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">Versioning</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Keep multiple versions of objects</p>
        </div>
        <button
          type="button"
          class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {versioning ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}"
          onclick={() => { if (!objectLocking) versioning = !versioning; }}
          role="switch"
          aria-checked={versioning}
          disabled={objectLocking}
          title={objectLocking ? 'Versioning is required when Object Locking is enabled' : ''}
        >
          <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform {versioning ? 'translate-x-4.5' : 'translate-x-0.5'}" />
        </button>
      </div>

      <!-- Object Locking Toggle -->
      <div class="flex items-center justify-between py-2.5">
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">Object Locking</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Prevent objects from being deleted. Requires versioning.</p>
        </div>
        <button
          type="button"
          class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {objectLocking ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}"
          onclick={handleObjectLockingToggle}
          role="switch"
          aria-checked={objectLocking}
        >
          <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform {objectLocking ? 'translate-x-4.5' : 'translate-x-0.5'}" />
        </button>
      </div>
    </div>
  </form>

  {#snippet footer()}
    <div class="flex w-full justify-end gap-2">
      <Button color="alternative" onclick={handleCancel}>
        Cancel
      </Button>
      <Button onclick={handleSubmit} disabled={!isValid} class="bg-primary-600 hover:bg-primary-700 text-white">
        Create Bucket
      </Button>
    </div>
  {/snippet}
</Modal>
