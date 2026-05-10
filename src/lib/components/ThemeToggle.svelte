<script lang="ts">
  import { onMount } from 'svelte';
  import { MoonSolid, SunSolid } from 'flowbite-svelte-icons';

  let dark = $state(false);

  onMount(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem('theme');
    if (stored) {
      dark = stored === 'dark';
    } else {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyTheme();
  });

  function applyTheme() {
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }

  function toggle() {
    dark = !dark;
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    applyTheme();
  }
</script>

<button
  onclick={toggle}
  class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
  title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {#if dark}
    <SunSolid class="h-5 w-5" />
  {:else}
    <MoonSolid class="h-5 w-5" />
  {/if}
</button>
