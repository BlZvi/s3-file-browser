<script>
  import '../app.css';
  import Toast from '$lib/components/Toast.svelte';
  import TransferManager from '$lib/components/TransferManager.svelte';
  let { children } = $props();
</script>

<svelte:head>
  <title>ObjectDock</title>
</svelte:head>

{@render children()}
<TransferManager />
<Toast />
