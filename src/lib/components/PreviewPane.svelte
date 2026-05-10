<script lang="ts">
  import ImagePreview from './ImagePreview.svelte';
  import TextPreview from './TextPreview.svelte';
  import FallbackPreview from './FallbackPreview.svelte';

  let {
    contentType = '',
    previewUrl = '',
    fileName = '',
  }: {
    contentType?: string;
    previewUrl?: string;
    fileName?: string;
  } = $props();

  // Determine preview type from content type and file extension
  let previewType = $derived(() => {
    const ct = contentType.toLowerCase();
    const ext = (fileName.split('.').pop() || '').toLowerCase();

    // Images
    if (ct.startsWith('image/')) return 'image';

    // Text-based content types
    if (ct.startsWith('text/')) return 'text';
    if (ct.includes('json')) return 'text';
    if (ct.includes('xml')) return 'text';
    if (ct.includes('yaml')) return 'text';
    if (ct.includes('javascript')) return 'text';
    if (ct.includes('typescript')) return 'text';
    if (ct.includes('css')) return 'text';
    if (ct.includes('html')) return 'text';
    if (ct.includes('svg')) return 'text';

    // Extension-based fallback
    const textExts = ['txt', 'log', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env', 'sh', 'bash', 'zsh', 'py', 'js', 'ts', 'jsx', 'tsx', 'svelte', 'vue', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'css', 'scss', 'less', 'html', 'htm', 'sql', 'graphql', 'proto', 'makefile', 'dockerfile'];
    if (textExts.includes(ext)) return 'text';

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'avif'];
    if (imageExts.includes(ext)) return 'image';

    return 'fallback';
  });
</script>

{#if previewUrl}
  {#if previewType() === 'image'}
    <ImagePreview url={previewUrl} alt={fileName} />
  {:else if previewType() === 'text'}
    <TextPreview url={previewUrl} {contentType} />
  {:else}
    <FallbackPreview {contentType} {fileName} />
  {/if}
{:else}
  <FallbackPreview {contentType} {fileName} />
{/if}
