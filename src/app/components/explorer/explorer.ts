import { Component, effect, inject, signal, ChangeDetectionStrategy, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { _Object, Bucket } from '@aws-sdk/client-s3';
import { S3Service } from '../../services/s3.service';
import { StateService } from '../../services/state.service';
import { ThemeService } from '../../services/theme.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MillerColumnsComponent } from '../miller-columns/miller-columns';
import { DetailsPanelComponent } from '../details-panel/details-panel';
import { UpdateNotifier } from '../update-notifier/update-notifier';

@Component({
  selector: 'app-explorer',
  standalone: true,
  imports: [MillerColumnsComponent, DetailsPanelComponent, UpdateNotifier],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="h-screen flex flex-col bg-white font-sans text-gray-900 overflow-hidden dark:bg-slate-950 dark:text-slate-100"
    >
      <!-- Header Area -->
      <header
        class="h-14 border-b border-gray-200 flex items-center justify-between px-4 shrink-0 bg-white dark:bg-slate-950 dark:border-slate-800"
      >
        <div class="flex items-center gap-6">
          <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            🪣 LocalStack Explorer
          </h1>

          @if (showUpdateNotifier()) {
            @defer {
              <app-update-notifier />
            }
          }
          <div
            class="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 font-mono dark:bg-slate-800 dark:text-slate-400 border border-gray-200/50 dark:border-slate-700/50"
          >
            {{ s3Service.endpoint() }}
          </div>
        </div>

        <div class="flex items-center gap-3">
          @if (buckets().length > 0) {
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500 dark:text-slate-400">Bucket:</span>
              <select
                class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-48 p-2 py-1.5 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                [value]="stateService.selectedBucket() || buckets()[0].Name"
                (change)="onBucketSelect($event)"
              >
                @for (bucket of buckets(); track bucket.Name) {
                  <option [value]="bucket.Name">{{ bucket.Name }}</option>
                }
              </select>
            </div>
          }

          <button
            (click)="disconnect()"
            class="text-sm font-semibold text-red-600 hover:text-red-700 active:text-red-800 bg-red-50 hover:bg-red-100 active:bg-red-200 px-4 py-2 rounded-xl transition-all cursor-pointer active:scale-[0.98] border border-red-100 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/40"
          >
            Disconnect
          </button>
        </div>
      </header>

      <!-- Main Workspace -->
      <main class="flex-1 flex overflow-hidden bg-white dark:bg-slate-950">
        @if (stateService.selectedBucket()) {
          <app-miller-columns
            class="flex-1 flex overflow-hidden border-r border-gray-200 dark:border-slate-800"
            [bucket]="stateService.selectedBucket()!"
          ></app-miller-columns>

          <app-details-panel
            [file]="stateService.activeObject()"
            [bucketName]="stateService.selectedBucket()!"
          ></app-details-panel>
        } @else if (buckets().length === 0) {
          <div
            class="flex-1 flex flex-col items-center justify-center text-gray-400 dark:bg-slate-950"
          >
            <div
              class="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 dark:bg-slate-900 dark:border dark:border-slate-800"
            >
              <span class="inline-flex items-center justify-center text-3xl text-gray-300 dark:text-slate-600">📦</span>
            </div>
            <p class="text-gray-500 font-medium dark:text-slate-400">
              No buckets found in this localstack instance.
            </p>
          </div>
        }
      </main>
    </div>
  `,
})
export class ExplorerComponent {
  protected s3Service = inject(S3Service);
  protected stateService = inject(StateService);
  protected themeService = inject(ThemeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  buckets = signal<Bucket[]>([]);
  showUpdateNotifier = signal<boolean>(true);

  private params = toSignal(this.route.params);

  constructor() {
    // Hide update notifier when running on GitHub Pages (github.io)
    this.showUpdateNotifier.set(
      !(typeof window !== 'undefined' && window.location.hostname.includes('vajahath.github.io')),
    );
    effect(async () => {
      const params = this.params();
      if (!params) return;

      const endpoint = params['endpoint'] || null;
      const bucket = params['bucket'] || null;
      const prefix = params['prefix'] || null;

      console.log('[ExplorerComponent] Effect running', { endpoint, bucket, prefix });

      untracked(() => {
        // Ensure state is synced from URL first
        this.stateService.syncFromUrl(bucket, prefix, endpoint);

        // If we have an endpoint in URL but not connected, connect now
        if (endpoint && !this.stateService.isConnected()) {
          try {
            const decodedEndpoint = atob(endpoint);
            this.s3Service.connect(decodedEndpoint);
            this.stateService.isConnected.set(true);
            this.stateService.endpoint.set(decodedEndpoint);
          } catch (e) {
            console.error('Failed to auto-connect from URL', e);
            this.disconnect();
          }
        }
      });

      // Load buckets if connected and not already loaded
      // We use untracked here to prevent this effect from re-running when this.buckets() signal is updated,
      // which was causing a race condition where syncFromUrl(null) would clear the auto-selected bucket.
      if (untracked(() => this.stateService.isConnected() && this.buckets().length === 0)) {
        await this.loadBuckets();
      }
    });
  }

  private async loadBuckets() {
    console.log('[ExplorerComponent] Loading buckets...');
    try {
      const fetchedBuckets = await this.s3Service.listBuckets();
      console.log('[ExplorerComponent] Buckets fetched:', fetchedBuckets);
      this.buckets.set(fetchedBuckets);

      // If we don't have a selected bucket from URL but we have buckets, pick the first one
      if (
        !this.stateService.selectedBucket() &&
        fetchedBuckets.length > 0 &&
        fetchedBuckets[0].Name
      ) {
        console.log('[ExplorerComponent] Auto-selecting first bucket:', fetchedBuckets[0].Name);
        this.stateService.navigateBucket(fetchedBuckets[0].Name!);
      }
    } catch (error) {
      console.error('Failed fetching buckets', error);
      // Only disconnect if it's a critical failure (e.g. initial load)
      if (this.buckets().length === 0) {
        this.disconnect();
      }
    }
  }

  onBucketSelect(event: Event) {
    const bucket = (event.target as HTMLSelectElement).value;
    this.stateService.navigateBucket(bucket);
  }

  disconnect() {
    this.s3Service.disconnect();
    this.router.navigate(['/']);
  }
}
