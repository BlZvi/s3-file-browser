<script lang="ts">
  import { Modal, Button, Label, Input } from 'flowbite-svelte';

  let {
    open = $bindable(false),
    currentName = '',
    isFolder = false,
    onsubmit,
  }: {
    open: boolean;
    currentName: string;
    isFolder: boolean;
    onsubmit: (newName: string) => void;
  } = $props();

  let newName = $state('');
  let error = $state('');
  let inputEl: HTMLInputElement | undefined = $state();

  // When modal opens, initialize the name and auto-select
  $effect(() => {
    if (open) {
      // For folders, strip trailing slash
      newName = isFolder ? currentName.replace(/\/$/, '') : currentName;
      error = '';

      // Auto-select filename without extension after a tick
      setTimeout(() => {
        if (inputEl) {
          inputEl.focus();
          if (!isFolder) {
            const dotIndex = newName.lastIndexOf('.');
            if (dotIndex > 0) {
              inputEl.setSelectionRange(0, dotIndex);
            } else {
              inputEl.select();
            }
          } else {
            inputEl.select();
          }
        }
      }, 50);
    }
  });

  function validate(name: string): string | null {
    if (!name.trim()) return 'Name cannot be empty';
    if (name !== name.trim()) return 'Name cannot have leading or trailing spaces';
    if (name.includes('/')) return 'Name cannot contain "/"';
    return null;
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    const validationError = validate(newName);
    if (validationError) {
      error = validationError;
      return;
    }

    // Don't submit if name hasn't changed
    const originalName = isFolder ? currentName.replace(/\/$/, '') : currentName;
    if (newName === originalName) {
      open = false;
      return;
    }

    onsubmit(newName);
    open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  }
</script>

<Modal title="Rename" bind:open size="sm">
  <form onsubmit={handleSubmit}>
    <div class="mb-4">
      <Label for="renameName" class="mb-2">New Name</Label>
      <Input
        id="renameName"
        type="text"
        placeholder="Enter new name"
        required
        bind:value={newName}
        onkeydown={handleKeydown}
      />
      {#if error}
        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      {/if}
    </div>
  </form>

  {#snippet footer()}
    <div class="flex w-full justify-end gap-2">
      <Button color="alternative" onclick={() => { open = false; error = ''; }}>
        Cancel
      </Button>
      <Button onclick={handleSubmit} disabled={!newName.trim() || !!validate(newName)} class="bg-primary-600 hover:bg-primary-700 text-white">
        Rename
      </Button>
    </div>
  {/snippet}
</Modal>
