import { Injectable, computed, signal, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { type _Object } from '@aws-sdk/client-s3';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private router = inject(Router);

  // Core State
  readonly isConnected = signal(false);
  readonly endpoint = signal<string | null>(null);
  readonly selectedBucket = signal<string | null>(null);
  readonly selectedPathParts = signal<string[]>([]);
  readonly activeObject = signal<_Object | null>(null);

  constructor() {
    // Keep URL in sync with state
    effect(() => {
      // Only sync to URL if we are in connected mode
      if (!this.isConnected()) return;

      const endpoint = this.endpoint();
      const bucket = this.selectedBucket();
      const parts = this.selectedPathParts();

      console.log('[StateService] Effect running, syncing to URL', { endpoint, bucket, parts });

      const params: Record<string, string> = {};
      if (endpoint) params['endpoint'] = btoa(endpoint);
      if (bucket) params['bucket'] = bucket;
      if (parts.length > 0) params['prefix'] = parts.join('/') + '/';

      // Navigate to /explorer with matrix parameters
      this.router.navigate(['/explorer', params], {
        replaceUrl: true, // Use replaceUrl so we don't spam the browser history with every folder click
      });
    });
  }

  // Derived state for the full prefix string (e.g., 'folder1/folder2/')
  readonly currentPrefix = computed(() => {
    const parts = this.selectedPathParts();
    if (parts.length === 0) return '';
    return parts.join('/') + '/';
  });

  navigateBucket(bucket: string) {
    this.selectedBucket.set(bucket);
    this.selectedPathParts.set([]);
    this.activeObject.set(null);
  }

  navigatePath(parts: string[]) {
    this.selectedPathParts.set(parts);
  }

  // This will be called on app load to restore state from URL
  syncFromUrl(bucket: string | null, prefix: string | null, endpoint: string | null) {
    console.log('[StateService] syncFromUrl', { bucket, prefix, endpoint });
    // We update these only if they differ to avoid triggering the effect unnecessarily
    if (endpoint) {
      try {
        const decoded = atob(endpoint);
        if (this.endpoint() !== decoded) {
          this.endpoint.set(decoded);
        }
      } catch (e) {
        console.error('Failed to decode endpoint from URL', e);
      }
    } else if (this.endpoint() !== null) {
      this.endpoint.set(null);
    }

    if (this.selectedBucket() !== bucket) {
      this.selectedBucket.set(bucket);
    }

    const newParts = prefix ? prefix.split('/').filter((p) => p !== '') : [];
    const currentParts = this.selectedPathParts();
    const isSameParts =
      newParts.length === currentParts.length && newParts.every((p, i) => p === currentParts[i]);

    if (!isSameParts) {
      this.selectedPathParts.set(newParts);
    }
  }
}
