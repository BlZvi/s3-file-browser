<script lang="ts" module>
  import { writable } from 'svelte/store';

  export type ToastType = 'success' | 'error' | 'warning' | 'info';

  export interface ToastMessage {
    id: number;
    type: ToastType;
    message: string;
    duration: number;
  }

  let nextId = 0;
  export const toasts = writable<ToastMessage[]>([]);

  export function addToast(message: string, type: ToastType = 'info', duration = 4000) {
    const id = nextId++;
    toasts.update((t) => [...t, { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }

  export function removeToast(id: number) {
    toasts.update((t) => t.filter((toast) => toast.id !== id));
  }
</script>

<script lang="ts">
  import { fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import {
    CheckCircleSolid,
    CloseCircleSolid,
    ExclamationCircleSolid,
    InfoCircleSolid,
    CloseOutline,
  } from 'flowbite-svelte-icons';

  const icons = {
    success: CheckCircleSolid,
    error: CloseCircleSolid,
    warning: ExclamationCircleSolid,
    info: InfoCircleSolid,
  };

  const colors = {
    success: 'text-green-500 bg-green-100 dark:bg-green-800 dark:text-green-200',
    error: 'text-red-500 bg-red-100 dark:bg-red-800 dark:text-red-200',
    warning: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-800 dark:text-yellow-200',
    info: 'text-blue-500 bg-blue-100 dark:bg-blue-800 dark:text-blue-200',
  };
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
  {#each $toasts as toast (toast.id)}
    <div
      animate:flip={{ duration: 200 }}
      in:fly={{ x: 300, duration: 300 }}
      out:fly={{ x: 300, duration: 200 }}
      class="pointer-events-auto flex w-80 items-center gap-3 rounded-lg bg-white p-4 shadow-lg ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      role="alert"
    >
      <div class="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg {colors[toast.type]}">
        <svelte:component this={icons[toast.type]} class="h-5 w-5" />
      </div>
      <div class="text-sm font-medium text-gray-900 dark:text-white flex-1">{toast.message}</div>
      <button
        onclick={() => removeToast(toast.id)}
        class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <CloseOutline class="h-4 w-4" />
      </button>
    </div>
  {/each}
</div>
