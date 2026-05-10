<script lang="ts">
  import { Modal, Button } from 'flowbite-svelte';
  import { UploadOutline, CloseOutline } from 'flowbite-svelte-icons';

  let {
    open = $bindable(false),
    bucket,
    prefix,
    onsubmit,
  }: {
    open: boolean;
    bucket: string;
    prefix: string;
    onsubmit: (files: File[]) => void;
  } = $props();

  let files = $state<File[]>([]);
  let dragOver = $state(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      addFiles(Array.from(input.files));
    }
  }

  function addFiles(newFiles: File[]) {
    files = [...files, ...newFiles];
  }

  function removeFile(index: number) {
    files = files.filter((_, i) => i !== index);
  }

  function submitFiles() {
    if (files.length === 0) return;
    const submitted = [...files];
    files = [];
    open = false;
    onsubmit(submitted);
  }

  function cancel() {
    open = false;
    files = [];
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }
</script>

<Modal title="Upload Files" bind:open size="lg">
  <div
    class="mb-4 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 {dragOver
      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
      : 'border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700/50 dark:hover:border-gray-500'}"
    ondrop={handleDrop}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    role="button"
    tabindex="0"
  >
    <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full {dragOver ? 'bg-primary-100 dark:bg-primary-900/40' : 'bg-gray-100 dark:bg-gray-600'}">
      <UploadOutline class="h-6 w-6 {dragOver ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-300'}" />
    </div>
    <p class="mb-1 text-sm text-gray-600 dark:text-gray-300">
      <span class="font-semibold text-primary-600 dark:text-primary-400">Click to upload</span> or drag and drop
    </p>
    <p class="text-xs text-gray-400 dark:text-gray-500">Upload to: {bucket}/{prefix || '(root)'}</p>
    <input
      type="file"
      multiple
      class="absolute inset-0 cursor-pointer opacity-0"
      onchange={handleFileInput}
      style="position: relative; margin-top: 8px;"
    />
  </div>

  {#if files.length > 0}
    <div class="mb-4 max-h-60 space-y-2 overflow-y-auto">
      {#each files as file, i}
        <div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex-1 truncate">
              <span class="text-sm font-medium text-gray-900 dark:text-white">{file.name}</span>
              <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</span>
            </div>
            <button
              onclick={() => removeFile(i)}
              class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-600 dark:hover:text-red-400 transition-colors"
            >
              <CloseOutline class="h-4 w-4" />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#snippet footer()}
    <div class="flex w-full justify-end gap-2">
      <Button color="alternative" onclick={cancel}>
        Cancel
      </Button>
      <Button onclick={submitFiles} disabled={files.length === 0} class="bg-primary-600 hover:bg-primary-700 text-white">
        Upload {files.length} file{files.length !== 1 ? 's' : ''}
      </Button>
    </div>
  {/snippet}
</Modal>
