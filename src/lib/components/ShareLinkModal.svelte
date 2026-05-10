<script lang="ts">
  import { Modal, Button, Input, Label, Select } from 'flowbite-svelte';
  import { ClipboardOutline, CheckOutline } from 'flowbite-svelte-icons';
  import { addToast } from '$lib/components/Toast.svelte';

  let {
    open = $bindable(false),
    bucket,
    fileKey,
  }: {
    open: boolean;
    bucket: string;
    fileKey: string;
  } = $props();

  let expiresIn = $state(3600);
  let generatedUrl = $state('');
  let loading = $state(false);
  let copied = $state(false);

  const expiryOptions = [
    { value: 900, name: '15 minutes' },
    { value: 3600, name: '1 hour' },
    { value: 86400, name: '1 day' },
    { value: 604800, name: '7 days' },
  ];

  async function generateLink() {
    loading = true;
    try {
      const res = await fetch('/api/s3/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket, key: fileKey, expiresIn }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate link');
      }

      const data = await res.json();
      generatedUrl = data.url;
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      loading = false;
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      copied = true;
      addToast('Link copied to clipboard', 'success');
      setTimeout(() => { copied = false; }, 2000);
    } catch {
      const input = document.createElement('input');
      input.value = generatedUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      copied = true;
      addToast('Link copied to clipboard', 'success');
      setTimeout(() => { copied = false; }, 2000);
    }
  }

  $effect(() => {
    if (open) {
      generatedUrl = '';
      copied = false;
    }
  });
</script>

<Modal title="Share File" bind:open size="md" class="backdrop-blur-sm rounded-xl">
  <div class="space-y-4">
    <p class="text-sm text-slate-600 dark:text-slate-400">
      Generate a temporary download link for: <strong class="text-slate-900 dark:text-white font-mono">{fileKey}</strong>
    </p>

    <div>
      <Label for="expiry" class="mb-2">Link expires in</Label>
      <Select id="expiry" bind:value={expiresIn} items={expiryOptions} />
    </div>

    {#if generatedUrl}
      <div>
        <Label class="mb-2">Share URL</Label>
        <div class="flex gap-2">
          <Input type="text" value={generatedUrl} readonly class="flex-1 font-mono text-xs" />
          <Button color="light" onclick={copyToClipboard}>
            {#if copied}
              <CheckOutline class="h-4 w-4 text-emerald-500" />
            {:else}
              <ClipboardOutline class="h-4 w-4" />
            {/if}
          </Button>
        </div>
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <div class="flex w-full justify-end gap-2">
      <Button color="alternative" onclick={() => { open = false; }}>Close</Button>
      <Button onclick={generateLink} disabled={loading} class="bg-primary-600 hover:bg-primary-700 text-white">
        {loading ? 'Generating...' : generatedUrl ? 'Regenerate' : 'Generate Link'}
      </Button>
    </div>
  {/snippet}
</Modal>
