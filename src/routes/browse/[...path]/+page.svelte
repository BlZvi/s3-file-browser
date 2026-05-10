<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import type { BucketInfo, BucketDetails, S3Object, BrowseResult } from '$lib/types';
  import BucketSidebar from '$lib/components/BucketSidebar.svelte';
  import GlobalHeader from '$lib/components/GlobalHeader.svelte';
  import BreadcrumbBar from '$lib/components/BreadcrumbBar.svelte';
  import FileTable from '$lib/components/FileTable.svelte';
  import RightPanel from '$lib/components/RightPanel.svelte';
  import ContextMenu from '$lib/components/ContextMenu.svelte';
  import DragDropOverlay from '$lib/components/DragDropOverlay.svelte';
  import UploadModal from '$lib/components/UploadModal.svelte';
  import UploadProgress, { type UploadFileStatus } from '$lib/components/UploadProgress.svelte';
  import CreateFolderModal from '$lib/components/CreateFolderModal.svelte';
  import CreateBucketModal from '$lib/components/CreateBucketModal.svelte';
  import DeleteBucketModal from '$lib/components/DeleteBucketModal.svelte';
  import DeleteConfirmModal from '$lib/components/DeleteConfirmModal.svelte';
  import ShareLinkModal from '$lib/components/ShareLinkModal.svelte';
  import RenameModal from '$lib/components/RenameModal.svelte';
  import PathPickerModal from '$lib/components/PathPickerModal.svelte';
  import BucketDetailsPanel from '$lib/components/BucketDetailsPanel.svelte';
  import BookmarksPanel from '$lib/components/BookmarksPanel.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import PaginationBar from '$lib/components/PaginationBar.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { addToast } from '$lib/components/Toast.svelte';
  import { performMultipartUpload, shouldUseMultipart } from '$lib/multipart-upload';
  import { addTransfer, updateTransfer } from '$lib/stores/transfers.svelte';
  import { getBookmarks, getRecentItems, addRecentItem } from '$lib/stores/bookmarks.svelte';

  let buckets = $state<BucketInfo[]>([]);
  let activeBucket = $state('');
  let currentPrefix = $state('');
  let objects = $state<S3Object[]>([]);
  let loading = $state(false);
  let loadingBuckets = $state(true);

  // Pagination state
  let continuationToken = $state<string | undefined>(undefined);
  let isTruncated = $state(false);
  let pageSize = $state(200);
  let loadingMore = $state(false);
  let autoLoadAll = $state(false);

  // Bucket details state
  let bucketDetails = $state<BucketDetails | null>(null);
  let loadingBucketInfo = $state(false);

  let bucketDetailsOpen = $state(false);

  let uploadOpen = $state(false);
  let createFolderOpen = $state(false);
  let createBucketOpen = $state(false);
  let deleteBucketOpen = $state(false);
  let deleteBucketName = $state('');
  let deleteOpen = $state(false);
  let shareOpen = $state(false);
  let deleteKeys = $state<string[]>([]);
  let shareKey = $state('');
  let lastLoaded = $state('');
  let sidebarOpen = $state(false);
  let bookmarksPanelOpen = $state(false);
  let commandPaletteOpen = $state(false);
  let searchQuery = $state('');
  let highlightKeys = $state<string[]>([]);

  // Recursive search state
  let searchResults = $state<S3Object[]>([]);
  let isSearching = $state(false);
  let searchMode = $state<'filter' | 'search'>('filter');
  let searchDebounceTimer = $state<ReturnType<typeof setTimeout> | null>(null);

  // Rename / Copy / Move state
  let renameOpen = $state(false);
  let pathPickerOpen = $state(false);
  let pathPickerMode = $state<'copy' | 'move'>('copy');
  let renamingObject = $state<S3Object | null>(null);
  let copyMoveObject = $state<S3Object | null>(null);
  let editingKey = $state('');

  // Right panel state
  let selectedObject = $state<S3Object | null>(null);
  let rightPanelOpen = $state(false);

  // Context menu state
  let ctxMenuVisible = $state(false);
  let ctxMenuX = $state(0);
  let ctxMenuY = $state(0);
  let ctxMenuKey = $state('');
  let ctxMenuName = $state('');
  let ctxMenuIsFolder = $state(false);

  // Upload progress state
  let uploadProgressFiles = $state<UploadFileStatus[]>([]);
  let uploadProgressVisible = $state(false);
  let uploadProgressBucket = $state('');
  let uploadProgressPrefix = $state('');
  let pendingUploadFiles = $state<File[]>([]);

  // Keyboard navigation state
  let focusedIndex = $state(-1);

  // Auth mode (manual, fixed, or oidc)
  let authMode = $state<'manual' | 'fixed' | 'oidc'>('manual');
  let userEmail = $state('');
  let userName = $state('');

  // GlobalHeader ref for search focus
  let globalHeaderRef: ReturnType<typeof GlobalHeader> | undefined = $state();

  // Filter objects by search query (client-side filter mode)
  let filteredObjects = $derived(
    searchQuery && searchMode === 'filter'
      ? objects.filter((o) => o.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : objects
  );

  // Determine which objects to display: search results or filtered objects
  let displayedObjects = $derived(
    searchMode === 'search' && searchResults.length > 0 ? searchResults : filteredObjects
  );

  let isInSearchMode = $derived(searchMode === 'search' && searchResults.length > 0);

  // Debounced recursive search effect
  $effect(() => {
    const query = searchQuery;
    const mode = searchMode;
    if (query.length >= 2 && mode === 'search') {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => performSearch(), 300);
    } else {
      searchResults = [];
      isSearching = false;
    }
  });

  async function performSearch() {
    if (!activeBucket || searchQuery.length < 2) return;
    isSearching = true;
    try {
      const params = new URLSearchParams({
        bucket: activeBucket,
        prefix: currentPrefix,
        q: searchQuery,
      });
      const res = await fetch(`/api/s3/search?${params}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      searchResults = data.objects;
    } catch (err) {
      addToast('Search failed', 'error');
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }

  function handleSearchModeChange(mode: 'filter' | 'search') {
    searchMode = mode;
    searchResults = [];
    // If switching to search mode with existing query, trigger search
    if (mode === 'search' && searchQuery.length >= 2) {
      performSearch();
    }
  }

  function parsePathFromUrl() {
    const pathParam = page.params.path || '';
    if (pathParam) {
      const parts = pathParam.split('/');
      const bucket = parts[0];
      const prefix = parts.length > 1 ? parts.slice(1).join('/') + '/' : '';
      if (bucket !== activeBucket || prefix !== currentPrefix) {
        activeBucket = bucket;
        currentPrefix = prefix === '/' ? '' : prefix;
      }
    }
  }

  onMount(async () => {
    try {
      // Fetch auth mode for UI adjustments
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        if (sessionData.mode === 'fixed' || sessionData.mode === 'manual' || sessionData.mode === 'oidc') {
          authMode = sessionData.mode;
        }
        if (sessionData.user) {
          userEmail = sessionData.user.email || '';
          userName = sessionData.user.name || '';
        }
      } catch {
        // Non-critical — default to manual
      }

      const res = await fetch('/api/s3/buckets');
      if (res.status === 401) { goto('/'); return; }
      const data = await res.json();
      buckets = data.buckets || [];
      parsePathFromUrl();
      if (activeBucket) await loadObjects();
    } catch { goto('/'); }
    finally { loadingBuckets = false; }
  });

  $effect(() => { const _ = page.params.path; parsePathFromUrl(); });

  $effect(() => {
    const key = `${activeBucket}:${currentPrefix}`;
    if (activeBucket && key !== lastLoaded && !loadingBuckets) loadObjects();
  });

  // Reset focused index when displayed objects change
  $effect(() => {
    const _ = displayedObjects;
    focusedIndex = -1;
  });

  async function loadObjects() {
    if (!activeBucket) return;
    const key = `${activeBucket}:${currentPrefix}`;
    lastLoaded = key;
    loading = true;
    searchQuery = '';
    selectedObject = null;
    rightPanelOpen = false;
    // Reset pagination state on fresh load
    continuationToken = undefined;
    isTruncated = false;
    autoLoadAll = false;
    try {
      const params = new URLSearchParams({ bucket: activeBucket, prefix: currentPrefix, maxKeys: String(pageSize) });
      const res = await fetch(`/api/s3/objects?${params}`);
      if (!res.ok) throw new Error('Failed to load objects');
      const data: BrowseResult = await res.json();
      objects = data.objects;
      continuationToken = data.continuationToken;
      isTruncated = data.isTruncated;
    } catch (err) {
      console.error('Failed to load objects:', err);
      addToast('Failed to load objects', 'error');
      objects = [];
    } finally { loading = false; }
  }

  async function loadMore() {
    if (!continuationToken || loadingMore) return;
    loadingMore = true;
    try {
      const params = new URLSearchParams({
        bucket: activeBucket,
        prefix: currentPrefix,
        continuationToken,
        maxKeys: String(pageSize),
      });
      const res = await fetch(`/api/s3/objects?${params}`);
      if (!res.ok) throw new Error('Failed to load more objects');
      const data: BrowseResult = await res.json();
      // Append new objects, avoiding duplicates by key
      objects = [...objects, ...data.objects.filter((o) => !objects.some((existing) => existing.key === o.key))];
      continuationToken = data.continuationToken;
      isTruncated = data.isTruncated;
    } catch (err) {
      console.error('Failed to load more objects:', err);
      addToast('Failed to load more objects', 'error');
    } finally {
      loadingMore = false;
    }
  }

  // Auto-load all pages when toggle is enabled
  $effect(() => {
    if (autoLoadAll && isTruncated && !loadingMore) {
      loadMore();
    }
  });

  /** Fetch bucket details (versioning, locking, tags) when active bucket changes */
  async function loadBucketInfo(bucketName: string) {
    if (!bucketName) { bucketDetails = null; return; }
    loadingBucketInfo = true;
    try {
      const res = await fetch(`/api/s3/buckets/info?bucket=${encodeURIComponent(bucketName)}`);
      if (!res.ok) throw new Error('Failed to load bucket info');
      bucketDetails = await res.json();
    } catch (err) {
      console.error('Failed to load bucket info:', err);
      bucketDetails = null;
    } finally { loadingBucketInfo = false; }
  }

  // Fetch bucket info whenever the active bucket changes
  $effect(() => {
    if (activeBucket) {
      loadBucketInfo(activeBucket);
    } else {
      bucketDetails = null;
    }
  });

  /** Get the creation date for the active bucket from the buckets list */
  let activeBucketCreationDate = $derived(
    buckets.find((b) => b.name === activeBucket)?.creationDate
  );

  /** Count of objects in the current listing (non-folder) */
  let objectCount = $derived(objects.filter((o) => !o.isFolder).length);

  /** Bucket versioning status for passing to child components */
  let bucketVersioning = $derived(bucketDetails?.versioning);

  function selectBucket(name: string) {
    activeBucket = name; currentPrefix = ''; lastLoaded = '';
    goto(`/browse/${name}`);
  }

  function navigateToPrefix(prefix: string) {
    // Track folder navigation as recent item
    if (prefix && activeBucket) {
      const folderName = prefix.split('/').filter(Boolean).pop() || prefix;
      addRecentItem({ bucket: activeBucket, key: prefix, name: folderName, isFolder: true });
    }
    currentPrefix = prefix; lastLoaded = '';
    const path = prefix ? `${activeBucket}/${prefix}` : activeBucket;
    goto(`/browse/${path.replace(/\/$/, '')}`);
  }

  function handleSidebarNavigate(bucket: string, prefix: string) {
    activeBucket = bucket;
    currentPrefix = prefix;
    lastLoaded = '';
    const path = prefix ? `${bucket}/${prefix}` : bucket;
    goto(`/browse/${path.replace(/\/$/, '')}`);
  }

  function handleDownload(key: string) {
    const fileName = key.split('/').pop() || key;
    const transferId = addTransfer({
      type: 'download',
      fileName,
      fileSize: 0,
      bucket: activeBucket,
      key,
      status: 'active',
      progress: 0,
      bytesTransferred: 0,
      speed: 0,
      estimatedTimeRemaining: 0,
    });

    const params = new URLSearchParams({ bucket: activeBucket, key });
    fetch(`/api/s3/download?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.url) window.open(data.url, '_blank');
        updateTransfer(transferId, {
          status: 'completed',
          progress: 100,
          completedAt: Date.now(),
        });
      })
      .catch((err) => {
        addToast('Download failed: ' + err.message, 'error');
        updateTransfer(transferId, {
          status: 'failed',
          error: err.message,
        });
      });
  }

  async function handleBulkDownload(keys: string[]) {
    if (keys.length === 0) return;
    // For a single file, use the regular download
    if (keys.length === 1) { handleDownload(keys[0]); return; }

    addToast(`Preparing ZIP download of ${keys.length} files…`, 'info');
    try {
      const res = await fetch('/api/s3/download-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: activeBucket, keys }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(data.error || 'Download failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeBucket}-download.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast(`Downloaded ${keys.length} files as ZIP`, 'success');
    } catch (err: any) {
      addToast('Bulk download failed: ' + err.message, 'error');
    }
  }

  function handleDelete(keys: string[]) { deleteKeys = keys; deleteOpen = true; }
  function handlePresign(key: string) { shareKey = key; shareOpen = true; }

  function handleSelect(obj: S3Object) {
    if (obj.isFolder) return;
    // Track file view as recent item
    addRecentItem({ bucket: activeBucket, key: obj.key, name: obj.name, isFolder: false });
    selectedObject = obj;
    rightPanelOpen = true;
  }

  function handleContextMenu(e: MouseEvent, obj: S3Object) {
    ctxMenuX = e.clientX;
    ctxMenuY = e.clientY;
    ctxMenuKey = obj.key;
    ctxMenuName = obj.name;
    ctxMenuIsFolder = obj.isFolder;
    ctxMenuVisible = true;
  }

  function handleContextPreview(key: string) {
    const obj = objects.find((o) => o.key === key);
    if (obj) handleSelect(obj);
  }

  function handleFileDrop(files: File[]) {
    // Directly start upload with dropped files
    handleUploadSubmit(files);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    goto('/');
  }

  function handleDeleteConfirm() { lastLoaded = ''; loadObjects(); }

  function handleFolderCreated() { lastLoaded = ''; loadObjects(); }

  function handleRefresh() { lastLoaded = ''; loadObjects(); }

  /** Refresh the bucket list from the API */
  async function refreshBuckets() {
    try {
      const res = await fetch('/api/s3/buckets');
      if (res.ok) {
        const data = await res.json();
        buckets = data.buckets || [];
      }
    } catch (err) {
      console.error('Failed to refresh buckets:', err);
    }
  }

  /** Handle creating a new bucket */
  async function handleCreateBucket(name: string, options: { versioning: boolean; objectLocking: boolean }) {
    try {
      const res = await fetch('/api/s3/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, versioning: options.versioning, objectLocking: options.objectLocking }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create bucket');
      }
      addToast(`Bucket "${name}" created successfully`, 'success');
      createBucketOpen = false;
      await refreshBuckets();
      selectBucket(name);
    } catch (err: any) {
      addToast('Failed to create bucket: ' + err.message, 'error');
    }
  }

  /** Handle deleting a bucket */
  async function handleDeleteBucket() {
    if (!deleteBucketName) return;
    try {
      const res = await fetch('/api/s3/buckets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deleteBucketName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete bucket');
      }
      addToast(`Bucket "${deleteBucketName}" deleted`, 'success');
      deleteBucketOpen = false;
      // If we deleted the active bucket, clear the view
      if (activeBucket === deleteBucketName) {
        activeBucket = '';
        currentPrefix = '';
        objects = [];
        bucketDetails = null;
        goto('/browse');
      }
      await refreshBuckets();
    } catch (err: any) {
      addToast('Failed to delete bucket: ' + err.message, 'error');
    }
  }

  /** Open the delete bucket modal for a specific bucket */
  function openDeleteBucket(name: string) {
    deleteBucketName = name;
    deleteBucketOpen = true;
  }

  // --- Upload progress logic ---

  function handleUploadSubmit(files: File[]) {
    // Store the files for potential retry
    pendingUploadFiles = files;
    uploadProgressBucket = activeBucket;
    uploadProgressPrefix = currentPrefix;

    // Initialize progress tracking
    uploadProgressFiles = files.map((f) => ({
      name: f.name,
      status: 'pending' as const,
      progress: 0,
    }));
    uploadProgressVisible = true;

    // Start uploading
    executeUploads(files);
  }

  async function executeUploads(files: File[]) {
    const uploadedKeys: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Update status to uploading
      uploadProgressFiles = uploadProgressFiles.map((f, idx) =>
        idx === i ? { ...f, status: 'uploading' as const, progress: 0 } : f
      );

      // Add to transfer manager
      const abortController = new AbortController();
      const key = uploadProgressPrefix + file.name;
      const transferId = addTransfer({
        type: 'upload',
        fileName: file.name,
        fileSize: file.size,
        bucket: uploadProgressBucket,
        key,
        status: 'active',
        progress: 0,
        bytesTransferred: 0,
        speed: 0,
        estimatedTimeRemaining: 0,
        abortController,
      });

      try {
        if (shouldUseMultipart(file.size)) {
          // Multipart upload for large files (>= 100MB)
          await performMultipartUpload({
            file,
            bucket: uploadProgressBucket,
            key,
            onProgress: (progress) => {
              uploadProgressFiles = uploadProgressFiles.map((f, idx) =>
                idx === i ? { ...f, progress: progress.percentComplete } : f
              );
              updateTransfer(transferId, {
                progress: progress.percentComplete,
                bytesTransferred: progress.bytesUploaded,
                speed: progress.currentSpeed,
                estimatedTimeRemaining: progress.estimatedTimeRemaining,
              });
            },
            signal: abortController.signal,
          });
        } else {
          // Standard presigned URL upload for small files
          const res = await fetch('/api/s3/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bucket: uploadProgressBucket,
              key,
              contentType: file.type || 'application/octet-stream',
            }),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to get upload URL');
          }

          const { url } = await res.json();
          const uploadStartTime = Date.now();

          // Upload with XHR for progress tracking
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', url);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

            // Wire up abort controller
            abortController.signal.addEventListener('abort', () => {
              xhr.abort();
              reject(new Error('Upload cancelled'));
            });

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                uploadProgressFiles = uploadProgressFiles.map((f, idx) =>
                  idx === i ? { ...f, progress: pct } : f
                );
                const elapsed = (Date.now() - uploadStartTime) / 1000;
                const speed = elapsed > 0 ? e.loaded / elapsed : 0;
                const remaining = speed > 0 ? (e.total - e.loaded) / speed : 0;
                updateTransfer(transferId, {
                  progress: pct,
                  bytesTransferred: e.loaded,
                  speed,
                  estimatedTimeRemaining: remaining,
                });
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
              }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(file);
          });
        }

        // Mark as done
        uploadProgressFiles = uploadProgressFiles.map((f, idx) =>
          idx === i ? { ...f, status: 'done' as const, progress: 100 } : f
        );
        uploadedKeys.push(key);
        updateTransfer(transferId, {
          status: 'completed',
          progress: 100,
          bytesTransferred: file.size,
          completedAt: Date.now(),
        });
      } catch (err: any) {
        uploadProgressFiles = uploadProgressFiles.map((f, idx) =>
          idx === i ? { ...f, status: 'error' as const, progress: 0 } : f
        );
        if (err.message === 'Upload cancelled') {
          updateTransfer(transferId, { status: 'cancelled' });
        } else {
          updateTransfer(transferId, { status: 'failed', error: err.message });
        }
      }
    }

    // Refresh the file list after uploads
    if (uploadedKeys.length > 0) {
      lastLoaded = '';
      await loadObjects();
      highlightKeys = uploadedKeys;
      setTimeout(() => { highlightKeys = []; }, 2000);
    }
  }

  function handleUploadRetry() {
    // Retry only the failed files
    const failedIndices = uploadProgressFiles
      .map((f, i) => f.status === 'error' ? i : -1)
      .filter((i) => i !== -1);

    const failedFiles = failedIndices.map((i) => pendingUploadFiles[i]);

    // Reset failed files to pending
    uploadProgressFiles = uploadProgressFiles.map((f) =>
      f.status === 'error' ? { ...f, status: 'pending' as const, progress: 0 } : f
    );

    // Re-execute only failed uploads
    executeRetryUploads(failedFiles, failedIndices);
  }

  async function executeRetryUploads(files: File[], indices: number[]) {
    const uploadedKeys: string[] = [];

    for (let j = 0; j < files.length; j++) {
      const file = files[j];
      const i = indices[j];

      uploadProgressFiles = uploadProgressFiles.map((f, idx) =>
        idx === i ? { ...f, status: 'uploading' as const, progress: 0 } : f
      );

      // Add to transfer manager for retry
      const abortController = new AbortController();
      const key = uploadProgressPrefix + file.name;
      const transferId = addTransfer({
        type: 'upload',
        fileName: file.name,
        fileSize: file.size,
        bucket: uploadProgressBucket,
        key,
        status: 'active',
        progress: 0,
        bytesTransferred: 0,
        speed: 0,
        estimatedTimeRemaining: 0,
        abortController,
      });

      try {
        if (shouldUseMultipart(file.size)) {
          // Multipart upload for large files (>= 100MB)
          await performMultipartUpload({
            file,
            bucket: uploadProgressBucket,
            key,
            onProgress: (progress) => {
              uploadProgressFiles = uploadProgressFiles.map((f, idx) =>
                idx === i ? { ...f, progress: progress.percentComplete } : f
              );
              updateTransfer(transferId, {
                progress: progress.percentComplete,
                bytesTransferred: progress.bytesUploaded,
                speed: progress.currentSpeed,
                estimatedTimeRemaining: progress.estimatedTimeRemaining,
              });
            },
            signal: abortController.signal,
          });
        } else {
          // Standard presigned URL upload for small files
          const res = await fetch('/api/s3/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bucket: uploadProgressBucket,
              key,
              contentType: file.type || 'application/octet-stream',
            }),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to get upload URL');
          }

          const { url } = await res.json();
          const uploadStartTime = Date.now();

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', url);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

            abortController.signal.addEventListener('abort', () => {
              xhr.abort();
              reject(new Error('Upload cancelled'));
            });

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                uploadProgressFiles = uploadProgressFiles.map((f, idx) =>
                  idx === i ? { ...f, progress: pct } : f
                );
                const elapsed = (Date.now() - uploadStartTime) / 1000;
                const speed = elapsed > 0 ? e.loaded / elapsed : 0;
                const remaining = speed > 0 ? (e.total - e.loaded) / speed : 0;
                updateTransfer(transferId, {
                  progress: pct,
                  bytesTransferred: e.loaded,
                  speed,
                  estimatedTimeRemaining: remaining,
                });
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(`Upload failed: ${xhr.statusText}`));
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(file);
          });
        }

        uploadProgressFiles = uploadProgressFiles.map((f, idx) =>
          idx === i ? { ...f, status: 'done' as const, progress: 100 } : f
        );
        uploadedKeys.push(key);
        updateTransfer(transferId, {
          status: 'completed',
          progress: 100,
          bytesTransferred: file.size,
          completedAt: Date.now(),
        });
      } catch (err: any) {
        uploadProgressFiles = uploadProgressFiles.map((f, idx) =>
          idx === i ? { ...f, status: 'error' as const, progress: 0 } : f
        );
        if (err.message === 'Upload cancelled') {
          updateTransfer(transferId, { status: 'cancelled' });
        } else {
          updateTransfer(transferId, { status: 'failed', error: err.message });
        }
      }
    }

    if (uploadedKeys.length > 0) {
      lastLoaded = '';
      await loadObjects();
      highlightKeys = uploadedKeys;
      setTimeout(() => { highlightKeys = []; }, 2000);
    }
  }

  function handleUploadComplete(uploadedKeys: string[]) {
    // Clean up upload state
    uploadProgressFiles = [];
    pendingUploadFiles = [];
  }

  // --- Keyboard navigation ---

  function isAnyModalOpen(): boolean {
    return uploadOpen || createFolderOpen || createBucketOpen || deleteBucketOpen || deleteOpen || shareOpen || bucketDetailsOpen || renameOpen || pathPickerOpen || bookmarksPanelOpen || commandPaletteOpen;
  }

  function isInputFocused(): boolean {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable;
  }

  function handleKeydown(e: KeyboardEvent) {
    // Escape always works — close things in priority order
    if (e.key === 'Escape') {
      if (ctxMenuVisible) {
        ctxMenuVisible = false;
        e.preventDefault();
        return;
      }
      if (rightPanelOpen) {
        rightPanelOpen = false;
        selectedObject = null;
        e.preventDefault();
        return;
      }
      // If an input is focused, let the search input handle its own Escape
      return;
    }

    // Cmd/Ctrl+K — open command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      commandPaletteOpen = true;
      return;
    }

    // Cmd/Ctrl+F — focus search
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      globalHeaderRef?.focusSearch();
      return;
    }

    // Don't handle other shortcuts when modal is open or input is focused
    if (isAnyModalOpen() || isInputFocused()) return;

    const items = displayedObjects;
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusedIndex = focusedIndex < items.length - 1 ? focusedIndex + 1 : 0;
      const obj = items[focusedIndex];
      if (obj && !obj.isFolder) {
        selectedObject = obj;
        rightPanelOpen = true;
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusedIndex = focusedIndex > 0 ? focusedIndex - 1 : items.length - 1;
      const obj = items[focusedIndex];
      if (obj && !obj.isFolder) {
        selectedObject = obj;
        rightPanelOpen = true;
      }
      return;
    }

    if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < items.length) {
      e.preventDefault();
      const obj = items[focusedIndex];
      if (obj.isFolder) {
        navigateToPrefix(obj.key);
      } else {
        handleDownload(obj.key);
      }
      return;
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && focusedIndex >= 0 && focusedIndex < items.length) {
      e.preventDefault();
      const obj = items[focusedIndex];
      handleDelete([obj.key]);
      return;
    }

    // F2 — rename focused item
    if (e.key === 'F2' && focusedIndex >= 0 && focusedIndex < items.length) {
      e.preventDefault();
      const obj = items[focusedIndex];
      openRenameModal(obj);
      return;
    }
  }

  // --- Rename / Copy / Move handlers ---

  function openRenameModal(obj: S3Object) {
    renamingObject = obj;
    renameOpen = true;
  }

  function handleContextRename(key: string) {
    const obj = objects.find((o) => o.key === key);
    if (obj) openRenameModal(obj);
  }

  function handleContextCopy(key: string) {
    const obj = objects.find((o) => o.key === key);
    if (obj) {
      copyMoveObject = obj;
      pathPickerMode = 'copy';
      pathPickerOpen = true;
    }
  }

  function handleContextMove(key: string) {
    const obj = objects.find((o) => o.key === key);
    if (obj) {
      copyMoveObject = obj;
      pathPickerMode = 'move';
      pathPickerOpen = true;
    }
  }

  async function handleRename(newName: string) {
    if (!renamingObject) return;
    const obj = renamingObject;
    const isFolder = obj.isFolder;

    // Build new key: replace the last segment of the key
    const prefix = obj.key.slice(0, obj.key.length - obj.name.length - (isFolder ? 1 : 0));
    const newKey = isFolder ? prefix + newName + '/' : prefix + newName;

    // Optimistic update
    const oldObjects = [...objects];
    objects = objects.map((o) =>
      o.key === obj.key
        ? { ...o, key: newKey, name: newName }
        : o
    );

    try {
      const res = await fetch('/api/s3/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceBucket: activeBucket,
          sourceKey: obj.key,
          destBucket: activeBucket,
          destKey: newKey,
          mode: 'rename',
          isFolder,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to rename');
      }

      addToast(`Renamed "${obj.name}" to "${newName}"`, 'success');
      lastLoaded = '';
      await loadObjects();
    } catch (err: any) {
      objects = oldObjects;
      addToast('Rename failed: ' + err.message, 'error');
    }
  }

  async function handleCopyMove(dest: { bucket: string; prefix: string }) {
    if (!copyMoveObject) return;
    const obj = copyMoveObject;
    const isFolder = obj.isFolder;
    const destKey = dest.prefix + (isFolder ? obj.name + '/' : obj.name);

    try {
      const res = await fetch('/api/s3/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceBucket: activeBucket,
          sourceKey: obj.key,
          destBucket: dest.bucket,
          destKey,
          mode: pathPickerMode,
          isFolder,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${pathPickerMode}`);
      }

      const action = pathPickerMode === 'copy' ? 'Copied' : 'Moved';
      addToast(`${action} "${obj.name}" to ${dest.bucket}/${dest.prefix}`, 'success');

      // If move: remove from current view optimistically
      if (pathPickerMode === 'move') {
        objects = objects.filter((o) => o.key !== obj.key);
      }

      lastLoaded = '';
      await loadObjects();
    } catch (err: any) {
      addToast(`${pathPickerMode === 'copy' ? 'Copy' : 'Move'} failed: ` + err.message, 'error');
    }
  }

  function handleInlineRename(key: string, newName: string) {
    editingKey = '';
    const obj = objects.find((o) => o.key === key);
    if (!obj || newName === obj.name) return; // cancelled or no change
    renamingObject = obj;
    handleRename(newName);
  }

  function handleQuickNavigate(bucket: string, prefix: string) {
    bookmarksPanelOpen = false;
    commandPaletteOpen = false;
    if (bucket !== activeBucket) {
      activeBucket = bucket;
      currentPrefix = prefix;
      lastLoaded = '';
      const path = prefix ? `${bucket}/${prefix}` : bucket;
      goto(`/browse/${path.replace(/\/$/, '')}`);
    } else {
      navigateToPrefix(prefix);
    }
  }

  function goBack() {
    if (!currentPrefix) return;
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    navigateToPrefix(parts.length > 0 ? parts.join('/') + '/' : '');
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Global header spans full width -->
  <GlobalHeader
    bind:this={globalHeaderRef}
    bucket={activeBucket}
    prefix={currentPrefix}
    bind:searchQuery
    {searchMode}
    {authMode}
    {userEmail}
    {userName}
    onsearchmodechange={handleSearchModeChange}
    onlogout={handleLogout}
    ontoggleSidebar={() => { sidebarOpen = true; }}
  />

  <!-- Body: sidebar + content + panel -->
  <div class="flex flex-1 overflow-hidden">
    <!-- Sidebar -->
    <BucketSidebar
      buckets={buckets}
      {activeBucket}
      {currentPrefix}
      onselectbucket={selectBucket}
      onnavigate={handleSidebarNavigate}
      bind:mobileOpen={sidebarOpen}
      oncreatebucket={() => { createBucketOpen = true; }}
      ondeletebucket={openDeleteBucket}
      onopenbookmarks={() => { bookmarksPanelOpen = true; }}
    />

    <!-- Main content -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
      {#if loadingBuckets}
        <div class="flex flex-1 items-center justify-center">
          <Spinner size="lg" color="primary" />
        </div>
      {:else if !activeBucket}
        <!-- Empty state -->
        <div class="flex flex-1 items-center justify-center">
          <div class="text-center max-w-sm">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Select a bucket</h2>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Choose a bucket from the sidebar to browse its contents</p>
          </div>
        </div>
      {:else}
        <!-- Breadcrumb + file listing area -->
        <div class="flex-1 flex flex-col p-4 gap-3 overflow-hidden relative">
          <!-- Breadcrumb + bucket info bar (merged) -->
          <BreadcrumbBar
            bucket={activeBucket}
            prefix={currentPrefix}
            bucketInfo={bucketDetails}
            creationDate={activeBucketCreationDate}
            {objectCount}
            {isTruncated}
            onnavigate={navigateToPrefix}
            onrefresh={handleRefresh}
            oncreatefolder={() => { createFolderOpen = true; }}
            onupload={() => { uploadOpen = true; }}
            ondetails={() => { bucketDetailsOpen = true; }}
          />

          <!-- File listing with drag-drop -->
          <DragDropOverlay
            bucket={activeBucket}
            prefix={currentPrefix}
            ondrop={handleFileDrop}
          >
            <FileTable
              objects={displayedObjects}
              loading={loading || isSearching}
              {selectedObject}
              {highlightKeys}
              {focusedIndex}
              {editingKey}
              showFullPath={isInSearchMode}
              onnavigate={navigateToPrefix}
              ondownload={handleDownload}
              ondelete={handleDelete}
              onpresign={handlePresign}
              onselect={handleSelect}
              oncontextmenu={handleContextMenu}
              onbulkdownload={handleBulkDownload}
              onrename={handleInlineRename}
            />
          </DragDropOverlay>

          <!-- Pagination Bar -->
          <PaginationBar
            {isTruncated}
            {loadingMore}
            objectCount={objects.length}
            {pageSize}
            {autoLoadAll}
            onloadmore={loadMore}
            onpagesizechange={(size) => { pageSize = size; lastLoaded = ''; loadObjects(); }}
            onautoloadtoggle={(val) => { autoLoadAll = val; }}
          />

          <!-- Upload Progress Toast (inside relative container for absolute positioning) -->
          <UploadProgress
            files={uploadProgressFiles}
            bucket={uploadProgressBucket}
            prefix={uploadProgressPrefix}
            bind:visible={uploadProgressVisible}
            onretry={handleUploadRetry}
            oncomplete={handleUploadComplete}
          />
        </div>
      {/if}
    </main>

    <!-- Right Panel -->
    <RightPanel
      object={selectedObject}
      bucket={activeBucket}
      bind:open={rightPanelOpen}
      ondownload={handleDownload}
      {bucketVersioning}
    />
  </div>

  <!-- Context Menu -->
  <ContextMenu
    x={ctxMenuX}
    y={ctxMenuY}
    bind:visible={ctxMenuVisible}
    objectKey={ctxMenuKey}
    objectName={ctxMenuName}
    isFolder={ctxMenuIsFolder}
    ondownload={handleDownload}
    onshare={handlePresign}
    ondelete={handleDelete}
    onpreview={handleContextPreview}
    onrename={handleContextRename}
    oncopy={handleContextCopy}
    onmove={handleContextMove}
  />

  <!-- Modals -->
  <UploadModal bind:open={uploadOpen} bucket={activeBucket} prefix={currentPrefix} onsubmit={handleUploadSubmit} />
  <CreateFolderModal bind:open={createFolderOpen} bucket={activeBucket} prefix={currentPrefix} oncreated={handleFolderCreated} />
  <DeleteConfirmModal bind:open={deleteOpen} keys={deleteKeys} bucket={activeBucket} onconfirm={handleDeleteConfirm} />
  <ShareLinkModal bind:open={shareOpen} bucket={activeBucket} fileKey={shareKey} />
  <CreateBucketModal bind:open={createBucketOpen} oncreate={handleCreateBucket} />
  <DeleteBucketModal bind:open={deleteBucketOpen} bucketName={deleteBucketName} onconfirm={handleDeleteBucket} />

  <!-- Rename Modal -->
  <RenameModal
    bind:open={renameOpen}
    currentName={renamingObject?.name || ''}
    isFolder={renamingObject?.isFolder || false}
    onsubmit={handleRename}
  />

  <!-- Path Picker Modal (Copy/Move) -->
  <PathPickerModal
    bind:open={pathPickerOpen}
    {buckets}
    currentBucket={activeBucket}
    currentPrefix={currentPrefix}
    mode={pathPickerMode}
    objectName={copyMoveObject?.name || ''}
    onsubmit={handleCopyMove}
  />

  <!-- Bucket Details Panel (D10) -->
  <BucketDetailsPanel bind:open={bucketDetailsOpen} bucket={activeBucket} />

  <!-- Bookmarks Panel -->
  <BookmarksPanel
    bind:open={bookmarksPanelOpen}
    onnavigate={handleQuickNavigate}
    onclose={() => { bookmarksPanelOpen = false; }}
  />

  <!-- Command Palette (Ctrl+K) -->
  <CommandPalette
    bind:open={commandPaletteOpen}
    {buckets}
    bookmarks={getBookmarks()}
    recentItems={getRecentItems()}
    onnavigate={handleQuickNavigate}
    onclose={() => { commandPaletteOpen = false; }}
  />
</div>
