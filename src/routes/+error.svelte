<script>
  import { page } from '$app/stores';

  /** @type {{ title: string, subtitle: string }} */
  let errorInfo = $derived.by(() => {
    const status = $page.status;
    if (status === 404) {
      return {
        title: 'Page not found',
        subtitle: "The page you're looking for doesn't exist or has been moved."
      };
    }
    if (status >= 500) {
      return {
        title: 'Something went wrong',
        subtitle: 'An unexpected error occurred. Please try again later.'
      };
    }
    return {
      title: 'Error',
      subtitle: $page.error?.message ?? 'An unexpected error occurred.'
    };
  });

  function goBack() {
    history.back();
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-surface px-4 dark:bg-gray-900">
  <div class="text-center max-w-md">
    <!-- Status code -->
    <p class="text-8xl font-bold tracking-tight text-primary-600 dark:text-primary-200">
      {$page.status}
    </p>

    <!-- Title -->
    <h1 class="mt-4 text-2xl font-semibold text-on-surface dark:text-gray-50" style="letter-spacing: -0.02em;">
      {errorInfo.title}
    </h1>

    <!-- Subtitle -->
    <p class="mt-2 text-sm text-on-surface-variant dark:text-gray-400 leading-relaxed">
      {errorInfo.subtitle}
    </p>

    <!-- Actions -->
    <div class="mt-8 flex items-center justify-center gap-3">
      <button
        onclick={goBack}
        class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-on-surface shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        ← Go back
      </button>
      <a
        href="/"
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
      >
        Return to home
      </a>
    </div>
  </div>
</div>
