<script lang="ts">
  import { addToast } from '$lib/components/Toast.svelte';
  import type { CorsRule } from '$lib/types';

  let {
    bucket,
    rules = $bindable([]),
    onsave,
  }: {
    bucket: string;
    rules: CorsRule[];
    onsave?: () => void;
  } = $props();

  const ALL_METHODS = ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'];

  // Internal editable state
  let editRules = $state<CorsRule[]>([]);
  let originalSnapshot = $state('');
  let saving = $state(false);
  let deleting = $state(false);
  let testing = $state(false);

  // New item inputs per rule
  let newOrigins = $state<Record<number, string>>({});
  let newHeaders = $state<Record<number, string>>({});
  let newExposeHeaders = $state<Record<number, string>>({});

  // Sync from external rules prop
  $effect(() => {
    editRules = rules.map((r) => ({
      ...r,
      allowedOrigins: [...r.allowedOrigins],
      allowedMethods: [...r.allowedMethods],
      allowedHeaders: [...r.allowedHeaders],
      exposeHeaders: [...r.exposeHeaders],
      maxAgeSeconds: r.maxAgeSeconds
    }));
    originalSnapshot = JSON.stringify(rules);
    newOrigins = {};
    newHeaders = {};
    newExposeHeaders = {};
  });

  let isDirty = $derived(() => {
    return JSON.stringify(editRules) !== originalSnapshot;
  });

  // ── Rule management ──────────────────────────────────────────────────

  function addRule() {
    editRules = [
      ...editRules,
      {
        allowedOrigins: [],
        allowedMethods: ['GET'],
        allowedHeaders: ['*'],
        exposeHeaders: [],
        maxAgeSeconds: 3600
      }
    ];
  }

  function removeRule(index: number) {
    editRules = editRules.filter((_, i) => i !== index);
  }

  // ── Origin management ────────────────────────────────────────────────

  function addOrigin(ruleIndex: number) {
    const val = (newOrigins[ruleIndex] || '').trim();
    if (!val) return;
    editRules = editRules.map((r, i) =>
      i === ruleIndex
        ? { ...r, allowedOrigins: [...r.allowedOrigins, val] }
        : r
    );
    newOrigins = { ...newOrigins, [ruleIndex]: '' };
  }

  function removeOrigin(ruleIndex: number, originIndex: number) {
    editRules = editRules.map((r, i) =>
      i === ruleIndex
        ? { ...r, allowedOrigins: r.allowedOrigins.filter((_, j) => j !== originIndex) }
        : r
    );
  }

  // ── Method management ────────────────────────────────────────────────

  function toggleMethod(ruleIndex: number, method: string) {
    editRules = editRules.map((r, i) => {
      if (i !== ruleIndex) return r;
      const methods = r.allowedMethods.includes(method)
        ? r.allowedMethods.filter((m) => m !== method)
        : [...r.allowedMethods, method];
      return { ...r, allowedMethods: methods };
    });
  }

  // ── Header management ────────────────────────────────────────────────

  function addHeader(ruleIndex: number) {
    const val = (newHeaders[ruleIndex] || '').trim();
    if (!val) return;
    editRules = editRules.map((r, i) =>
      i === ruleIndex
        ? { ...r, allowedHeaders: [...r.allowedHeaders, val] }
        : r
    );
    newHeaders = { ...newHeaders, [ruleIndex]: '' };
  }

  function removeHeader(ruleIndex: number, headerIndex: number) {
    editRules = editRules.map((r, i) =>
      i === ruleIndex
        ? { ...r, allowedHeaders: r.allowedHeaders.filter((_, j) => j !== headerIndex) }
        : r
    );
  }

  // ── Expose Header management ─────────────────────────────────────────

  function addExposeHeader(ruleIndex: number) {
    const val = (newExposeHeaders[ruleIndex] || '').trim();
    if (!val) return;
    editRules = editRules.map((r, i) =>
      i === ruleIndex
        ? { ...r, exposeHeaders: [...r.exposeHeaders, val] }
        : r
    );
    newExposeHeaders = { ...newExposeHeaders, [ruleIndex]: '' };
  }

  function removeExposeHeader(ruleIndex: number, headerIndex: number) {
    editRules = editRules.map((r, i) =>
      i === ruleIndex
        ? { ...r, exposeHeaders: r.exposeHeaders.filter((_, j) => j !== headerIndex) }
        : r
    );
  }

  // ── Max Age ──────────────────────────────────────────────────────────

  function updateMaxAge(ruleIndex: number, value: string) {
    const num = parseInt(value, 10);
    editRules = editRules.map((r, i) =>
      i === ruleIndex
        ? { ...r, maxAgeSeconds: isNaN(num) ? undefined : num }
        : r
    );
  }

  // ── Quick Setup ──────────────────────────────────────────────────────

  function allowAllOrigins() {
    editRules = [
      {
        allowedOrigins: ['*'],
        allowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        allowedHeaders: ['*'],
        exposeHeaders: ['ETag', 'x-amz-request-id', 'x-amz-version-id'],
        maxAgeSeconds: 3600
      }
    ];
  }

  function allowObjectDockOrigin() {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    editRules = [
      {
        allowedOrigins: [origin],
        allowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        allowedHeaders: ['*', 'Content-Type', 'Authorization', 'x-amz-*'],
        exposeHeaders: ['ETag', 'x-amz-request-id', 'x-amz-version-id'],
        maxAgeSeconds: 3600
      }
    ];
  }

  // ── Save / Delete ────────────────────────────────────────────────────

  async function handleSave() {
    saving = true;
    try {
      const res = await fetch('/api/s3/buckets/cors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket, rules: editRules })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to save CORS' }));
        throw new Error(data.error || 'Failed to save CORS configuration');
      }
      rules = editRules.map((r) => ({ ...r }));
      originalSnapshot = JSON.stringify(rules);
      addToast('CORS configuration saved', 'success');
      if (onsave) onsave();
    } catch (err: any) {
      addToast('Failed to save CORS: ' + err.message, 'error');
    } finally {
      saving = false;
    }
  }

  async function handleDeleteAll() {
    if (!confirm('Delete all CORS rules for this bucket? This cannot be undone.')) return;
    deleting = true;
    try {
      const res = await fetch(`/api/s3/buckets/cors?bucket=${encodeURIComponent(bucket)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to delete CORS' }));
        throw new Error(data.error || 'Failed to delete CORS configuration');
      }
      editRules = [];
      rules = [];
      originalSnapshot = JSON.stringify([]);
      addToast('CORS configuration deleted', 'success');
      if (onsave) onsave();
    } catch (err: any) {
      addToast('Failed to delete CORS: ' + err.message, 'error');
    } finally {
      deleting = false;
    }
  }

  // ── Test CORS ────────────────────────────────────────────────────────

  async function testCors() {
    testing = true;
    try {
      const res = await fetch(
        `/api/s3/presign?bucket=${encodeURIComponent(bucket)}&key=__cors_test__&preview=true`,
        { method: 'GET' }
      );
      if (!res.ok) {
        addToast('Could not generate test URL', 'error');
        return;
      }
      const { url } = await res.json();

      const corsTest = await fetch(url, { method: 'HEAD', mode: 'cors' });
      if (corsTest.ok) {
        addToast('CORS is configured correctly! ✓', 'success');
      } else {
        addToast(`CORS test failed: HTTP ${corsTest.status}`, 'error');
      }
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('CORS')) {
        addToast('CORS is NOT configured. Browser blocked the request.', 'error');
      } else {
        addToast(`CORS test failed: ${err.message}`, 'error');
      }
    } finally {
      testing = false;
    }
  }
</script>

<div class="flex flex-col gap-3" data-testid="cors-editor">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-1.5">
      <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">CORS Configuration</span>
      <span class="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300 min-w-[18px]">
        {editRules.length}
      </span>
    </div>
    <button
      onclick={addRule}
      data-testid="cors-add-rule"
      class="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
    >
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      Add Rule
    </button>
  </div>

  <!-- Rules -->
  {#if editRules.length === 0}
    <div class="text-[11px] text-gray-400 dark:text-gray-500 italic py-2 text-center">
      No CORS rules configured
    </div>
  {:else}
    {#each editRules as rule, ruleIdx}
      <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-3 flex flex-col gap-2.5" data-testid="cors-rule">
        <!-- Rule header -->
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold text-gray-700 dark:text-gray-200">Rule {ruleIdx + 1}</span>
          <button
            onclick={() => removeRule(ruleIdx)}
            data-testid="cors-remove-rule"
            class="inline-flex items-center gap-1 text-[10px] font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
          >
            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Remove
          </button>
        </div>

        <!-- Allowed Origins -->
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Allowed Origins</span>
          <div class="flex gap-1">
            <input
              type="text"
              bind:value={newOrigins[ruleIdx]}
              onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOrigin(ruleIdx); } }}
              placeholder="e.g. http://localhost:5173 or *"
              data-testid="cors-origin-input"
              class="flex-1 min-w-0 font-mono text-[11px] text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button
              onclick={() => addOrigin(ruleIdx)}
              data-testid="cors-add-origin"
              class="px-2 py-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded border border-gray-200 dark:border-gray-600 transition-colors"
            >+</button>
          </div>
          {#if rule.allowedOrigins.length > 0}
            <div class="flex flex-wrap gap-1 mt-0.5">
              {#each rule.allowedOrigins as origin, originIdx}
                <span class="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-1.5 py-0.5 text-[10px] font-mono">
                  {origin}
                  <button
                    onclick={() => removeOrigin(ruleIdx, originIdx)}
                    aria-label="Remove origin {origin}"
                    class="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Allowed Methods -->
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Allowed Methods</span>
          <div class="flex flex-wrap gap-2">
            {#each ALL_METHODS as method}
              <label class="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rule.allowedMethods.includes(method)}
                  onchange={() => toggleMethod(ruleIdx, method)}
                  class="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                />
                <span class="text-[11px] font-mono text-gray-700 dark:text-gray-300">{method}</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- Allowed Headers -->
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Allowed Headers</span>
          <div class="flex gap-1">
            <input
              type="text"
              bind:value={newHeaders[ruleIdx]}
              onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHeader(ruleIdx); } }}
              placeholder="e.g. Content-Type or *"
              data-testid="cors-header-input"
              class="flex-1 min-w-0 font-mono text-[11px] text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button
              onclick={() => addHeader(ruleIdx)}
              data-testid="cors-add-header"
              class="px-2 py-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded border border-gray-200 dark:border-gray-600 transition-colors"
            >+</button>
          </div>
          {#if rule.allowedHeaders.length > 0}
            <div class="flex flex-wrap gap-1 mt-0.5">
              {#each rule.allowedHeaders as header, headerIdx}
                <span class="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-1.5 py-0.5 text-[10px] font-mono">
                  {header}
                  <button
                    onclick={() => removeHeader(ruleIdx, headerIdx)}
                    aria-label="Remove header {header}"
                    class="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Expose Headers -->
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expose Headers</span>
          <div class="flex gap-1">
            <input
              type="text"
              bind:value={newExposeHeaders[ruleIdx]}
              onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExposeHeader(ruleIdx); } }}
              placeholder="e.g. ETag"
              data-testid="cors-expose-header-input"
              class="flex-1 min-w-0 font-mono text-[11px] text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button
              onclick={() => addExposeHeader(ruleIdx)}
              data-testid="cors-add-expose-header"
              class="px-2 py-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded border border-gray-200 dark:border-gray-600 transition-colors"
            >+</button>
          </div>
          {#if rule.exposeHeaders.length > 0}
            <div class="flex flex-wrap gap-1 mt-0.5">
              {#each rule.exposeHeaders as header, headerIdx}
                <span class="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-1.5 py-0.5 text-[10px] font-mono">
                  {header}
                  <button
                    onclick={() => removeExposeHeader(ruleIdx, headerIdx)}
                    aria-label="Remove expose header {header}"
                    class="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Max Age -->
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Max Age (seconds)</span>
          <input
            type="number"
            value={rule.maxAgeSeconds ?? 3600}
            oninput={(e) => updateMaxAge(ruleIdx, e.currentTarget.value)}
            placeholder="3600"
            data-testid="cors-max-age"
            class="w-32 font-mono text-[11px] text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
      </div>
    {/each}
  {/if}

  <!-- Action buttons -->
  <div class="flex flex-col gap-2 mt-1">
    {#if isDirty() || editRules.length > 0}
      <div class="flex gap-2">
        {#if isDirty()}
          <button
            onclick={handleSave}
            disabled={saving}
            data-testid="cors-save"
            class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors"
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
              Save CORS Configuration
            {/if}
          </button>
        {/if}
        <button
          onclick={handleDeleteAll}
          disabled={deleting}
          data-testid="cors-delete-all"
          class="inline-flex items-center justify-center gap-1.5 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 px-3 py-1.5 text-[11px] font-semibold transition-colors"
        >
          {#if deleting}
            <svg class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          {/if}
          Delete All CORS
        </button>
      </div>
    {/if}

    <!-- Test CORS -->
    <button
      onclick={testCors}
      disabled={testing}
      data-testid="cors-test"
      class="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 px-3 py-1.5 text-[11px] font-semibold transition-colors"
    >
      {#if testing}
        <svg class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Testing…
      {:else}
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        Test CORS
      {/if}
    </button>

    <!-- Quick Setup -->
    <div class="flex flex-col gap-1.5">
      <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quick Setup</span>
      <div class="flex gap-2">
        <button
          onclick={allowAllOrigins}
          data-testid="cors-quick-all"
          class="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 px-2 py-1.5 text-[10px] font-semibold transition-colors"
        >
          Allow All Origins
        </button>
        <button
          onclick={allowObjectDockOrigin}
          data-testid="cors-quick-objectdock"
          class="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 px-2 py-1.5 text-[10px] font-semibold transition-colors"
        >
          Allow ObjectDock Origin
        </button>
      </div>
    </div>
  </div>
</div>
