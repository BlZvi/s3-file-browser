<script lang="ts">
  import { addToast } from '$lib/components/Toast.svelte';
  import TagEditor from './TagEditor.svelte';
  import CorsEditor from './CorsEditor.svelte';
  import Spinner from './Spinner.svelte';
  import type { CorsRule } from '$lib/types';

  let {
    open = $bindable(false),
    bucket,
  }: {
    open: boolean;
    bucket: string;
  } = $props();

  // Data state
  let loading = $state(false);
  let versioning = $state<'Enabled' | 'Suspended' | 'Disabled'>('Disabled');
  let objectLocking = $state(false);
  let tags = $state<Record<string, string>>({});
  let policy = $state<string | null>(null);
  let retention = $state<{ enabled: boolean; mode?: string; days?: number; years?: number } | null>(null);
  let corsRules = $state<CorsRule[]>([]);

  // Toggle state
  let togglingVersioning = $state(false);

  // Track last loaded bucket to avoid re-fetching
  let lastLoadedBucket = $state('');

  $effect(() => {
    if (open && bucket && bucket !== lastLoadedBucket) {
      lastLoadedBucket = bucket;
      loadAllDetails();
    }
    if (!open) {
      lastLoadedBucket = '';
    }
  });

  async function loadAllDetails() {
    loading = true;
    try {
      const [infoRes, policyRes, retentionRes, corsRes] = await Promise.all([
        fetch(`/api/s3/buckets/info?bucket=${encodeURIComponent(bucket)}`),
        fetch(`/api/s3/buckets/policy?bucket=${encodeURIComponent(bucket)}`).catch(() => null),
        fetch(`/api/s3/buckets/retention?bucket=${encodeURIComponent(bucket)}`).catch(() => null),
        fetch(`/api/s3/buckets/cors?bucket=${encodeURIComponent(bucket)}`).catch(() => null),
      ]);

      // Bucket info (versioning, locking, tags)
      if (infoRes.ok) {
        const info = await infoRes.json();
        versioning = info.versioning || 'Disabled';
        objectLocking = info.objectLocking || false;
        tags = info.tags || {};
      }

      // Policy
      if (policyRes && policyRes.ok) {
        const policyData = await policyRes.json();
        policy = policyData.policy || null;
      } else {
        policy = null;
      }

      // Retention
      if (retentionRes && retentionRes.ok) {
        retention = await retentionRes.json();
      } else {
        retention = null;
      }

      // CORS
      if (corsRes && corsRes.ok) {
        const corsData = await corsRes.json();
        corsRules = corsData.rules || [];
      } else {
        corsRules = [];
      }
    } catch (err) {
      console.error('Failed to load bucket details:', err);
      addToast('Failed to load bucket details', 'error');
    } finally {
      loading = false;
    }
  }

  async function toggleVersioning() {
    const newEnabled = versioning !== 'Enabled';
    togglingVersioning = true;
    try {
      const res = await fetch('/api/s3/buckets/versioning', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket, enabled: newEnabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to update versioning' }));
        throw new Error(data.error || 'Failed to update versioning');
      }
      versioning = newEnabled ? 'Enabled' : 'Suspended';
      addToast(`Versioning ${newEnabled ? 'enabled' : 'suspended'}`, 'success');
    } catch (err: any) {
      addToast('Failed to update versioning: ' + err.message, 'error');
    } finally {
      togglingVersioning = false;
    }
  }

  async function handleSaveTags(newTags: Record<string, string>) {
    const res = await fetch('/api/s3/buckets/tags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, tags: newTags }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to save tags' }));
      throw new Error(data.error || 'Failed to save tags');
    }
    addToast('Bucket tags saved', 'success');
  }

  function formatPolicy(policyStr: string): string {
    try {
      return JSON.stringify(JSON.parse(policyStr), null, 2);
    } catch {
      return policyStr;
    }
  }

  let versioningColor = $derived(() => {
    switch (versioning) {
      case 'Enabled': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'Suspended': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    }
  });
</script>

{#if open}
  <!-- Backdrop for mobile -->
  <button
    class="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 lg:hidden"
    onclick={() => { open = false; }}
    aria-label="Close panel"
    tabindex="-1"
  ></button>

  <!-- Slide-out panel -->
  <aside class="fixed right-0 top-0 bottom-0 w-96 max-w-full z-50 flex flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-[-8px_0_24px_rgba(0,0,0,0.08)]">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0 flex justify-between items-center">
      <div class="flex items-center gap-2.5">
        <div class="bg-primary-50 dark:bg-primary-900/20 p-1.5 rounded flex items-center justify-center">
          <svg class="h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
          </svg>
        </div>
        <div>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[260px]" title={bucket}>{bucket}</h2>
          <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Bucket Details</p>
        </div>
      </div>
      <button
        onclick={() => { open = false; }}
        class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all active:scale-90 shrink-0"
        aria-label="Close panel"
        title="Close"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <Spinner size="lg" color="primary" />
        </div>
      {:else}
        <!-- Versioning Section -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Versioning</span>
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium {versioningColor()}">
              {versioning}
            </span>
          </div>
          <p class="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
            {#if versioning === 'Enabled'}
              Objects are versioned. Previous versions are preserved on overwrite or delete.
            {:else if versioning === 'Suspended'}
              Versioning is suspended. New objects won't be versioned, but existing versions are preserved.
            {:else}
              Versioning is not enabled. Objects are overwritten on upload.
            {/if}
          </p>
          <button
            onclick={toggleVersioning}
            disabled={togglingVersioning}
            class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors
              {versioning === 'Enabled'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'}
              disabled:opacity-50"
          >
            {#if togglingVersioning}
              <svg class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            {/if}
            {versioning === 'Enabled' ? 'Suspend Versioning' : 'Enable Versioning'}
          </button>
        </div>

        <!-- Object Locking Section -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Object Locking</span>
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
              {objectLocking
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}">
              {objectLocking ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p class="text-[11px] text-gray-500 dark:text-gray-400">
            {#if objectLocking}
              Object locking is enabled. Objects can be protected from deletion using retention policies and legal holds.
            {:else}
              Object locking is not enabled. This can only be set at bucket creation time.
            {/if}
          </p>
        </div>

        <!-- Retention Section -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Default Retention</span>
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
              {retention?.enabled
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}">
              {retention?.enabled ? 'Configured' : 'None'}
            </span>
          </div>
          {#if retention?.enabled}
            <div class="flex flex-col gap-1.5">
              <div class="flex justify-between items-center text-[11px]">
                <span class="text-gray-500 dark:text-gray-400 font-medium">Mode</span>
                <span class="font-mono text-gray-900 dark:text-white font-bold uppercase">{retention.mode}</span>
              </div>
              {#if retention.days}
                <div class="flex justify-between items-center text-[11px]">
                  <span class="text-gray-500 dark:text-gray-400 font-medium">Duration</span>
                  <span class="text-gray-900 dark:text-white font-bold">{retention.days} day{retention.days !== 1 ? 's' : ''}</span>
                </div>
              {/if}
              {#if retention.years}
                <div class="flex justify-between items-center text-[11px]">
                  <span class="text-gray-500 dark:text-gray-400 font-medium">Duration</span>
                  <span class="text-gray-900 dark:text-white font-bold">{retention.years} year{retention.years !== 1 ? 's' : ''}</span>
                </div>
              {/if}
            </div>
          {:else}
            <p class="text-[11px] text-gray-500 dark:text-gray-400">
              No default retention policy is configured for this bucket.
            </p>
          {/if}
        </div>

        <!-- Tags Section (D14) -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <TagEditor
            bind:tags={tags}
            maxTags={50}
            onsave={handleSaveTags}
          />
        </div>

        <!-- CORS Section -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <CorsEditor
            {bucket}
            bind:rules={corsRules}
          />
        </div>

        <!-- Access Policy Section -->
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Access Policy</span>
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
              {policy
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}">
              {policy ? 'Configured' : 'No Policy'}
            </span>
          </div>
          {#if policy}
            <pre class="mt-2 p-3 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[10px] font-mono text-gray-800 dark:text-gray-200 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all">{formatPolicy(policy)}</pre>
          {:else}
            <p class="text-[11px] text-gray-500 dark:text-gray-400">
              No access policy is attached to this bucket.
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </aside>
{/if}
