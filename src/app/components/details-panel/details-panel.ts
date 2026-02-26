import { Component, OnDestroy, inject, input, signal, effect } from '@angular/core';
import { _Object } from '@aws-sdk/client-s3';
import { DatePipe, SlicePipe } from '@angular/common';
import { S3Service } from '../../services/s3.service';
import { ThemeService } from '../../services/theme.service';
import { MonacoEditorComponent } from '../monaco-editor/monaco-editor';

@Component({
  selector: 'app-details-panel',
  standalone: true,
  imports: [DatePipe, SlicePipe, MonacoEditorComponent],
  template: `
    <div
      class="h-full bg-white border-l border-gray-200 flex flex-col w-144 font-sans transition-all duration-300 shadow-xl overflow-hidden dark:bg-slate-950 dark:border-slate-800"
    >
      @if (file()) {
        <!-- Header -->
        <div class="px-6 py-4 bg-white border-b border-gray-100 shrink-0 shadow-sm z-10 dark:bg-slate-950 dark:border-slate-800">
          <h3 class="text-xl font-bold text-gray-900 truncate dark:text-slate-50" [title]="file()?.Key">
            {{ getFileName(file()?.Key) }}
          </h3>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto">
          <!-- 1. FULL WIDTH PREVIEW (Top Priority) -->
          <div
            class="bg-gray-50 border-b border-gray-200 relative group min-h-[400px] dark:bg-slate-900 dark:border-slate-800"
            [class.h-96]="isPreviewable() || previewContent()"
          >
            @if (isPreviewLoading()) {
              <div class="absolute inset-0 flex items-center justify-center bg-gray-50/80 z-20 transition-opacity dark:bg-slate-900/90">
                <svg class="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            }

            <!-- Monaco Editor Container with Deferred Loading -->
            @if (previewContent() !== null) {
              @defer (on timer(100ms)) {
                <app-monaco-editor 
                  [content]="previewContent()!" 
                  [language]="getLanguage()"
                  class="w-full h-full"
                ></app-monaco-editor>
              } @loading {
                <div class="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-slate-900/50">
                  <div class="text-xs font-bold text-blue-500 animate-pulse">Initializing Editor...</div>
                </div>
              } @placeholder {
                 <div class="w-full h-full bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800"></div>
              }
            }

            @if (!previewContent() && !isPreviewLoading()) {
              <div class="absolute inset-0 flex flex-col items-center justify-center p-12 text-gray-400 bg-gray-50 z-10 dark:bg-slate-900 dark:text-slate-500">
                <svg class="w-12 h-12 mb-3 text-gray-300 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div class="flex flex-col items-center gap-4 text-center">
                  <span class="text-sm font-medium">
                    {{ isPreviewable() ? 'Preparing preview...' : 'Preview not supported' }}
                  </span>
                  
                  @if (isGzip()) {
                    <button
                      (click)="decompressGzip()"
                      [disabled]="isDecompressing()"
                      class="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg border border-blue-200 transition-all active:scale-95 flex items-center gap-2 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/30"
                    >
                      @if (isDecompressing()) {
                        <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Unzipping...
                      } @else {
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                        Preview Unzipped
                      }
                    </button>
                  }
                </div>
              </div>
            }

            @if (isClipped() && previewContent()) {
              <div class="absolute bottom-3 right-3 px-3 py-1.5 bg-amber-50/90 backdrop-blur-sm border border-amber-200 text-amber-800 text-[10px] font-bold rounded-lg shadow-sm z-30 flex items-center gap-2 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-400">
                <svg class="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                {{ isGzip() ? 'Decompressed Preview (First 256KB raw)' : 'Clipped (First 5KB)' }}
              </div>
            }
          </div>

          <!-- 2. ACTIONS & METADATA -->
          <div class="px-5 py-6 space-y-8">
            <div class="flex gap-3">
              @if (previewContent() && canFormat()) {
                <button
                  (click)="formatContent()"
                  class="group flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 text-sm font-bold rounded-xl border border-indigo-100 transition-all cursor-pointer active:scale-[0.97] dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-900/30"
                  title="Format JSON"
                >
                  <svg class="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                  </svg>
                  Format
                </button>
              }

              <button
                (click)="download()"
                [disabled]="isDownloading()"
                class="flex-1 group flex items-center justify-center gap-2.5 px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white text-sm font-bold rounded-xl transition-all cursor-pointer active:scale-[0.97] shadow-lg shadow-blue-50 dark:shadow-none"
              >
                <svg 
                  class="w-5 h-5 text-blue-100 group-hover:text-white transition-colors" 
                  [class.animate-bounce]="isDownloading()"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Download
              </button>

              <button
                (click)="copyS3Uri()"
                class="group flex items-center justify-center gap-2.5 px-5 py-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-sm font-bold rounded-xl border border-gray-200 transition-all cursor-pointer active:scale-[0.97] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-300"
                [title]="'Copy S3 URI'"
              >
                <svg class="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                </svg>
                {{ copySuccess() ? 'Copied' : 'Copy URI' }}
              </button>
            </div>

            <div class="space-y-3">
              <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1 dark:text-slate-500">Detailed Properties</h4>
              <div class="bg-gray-50/50 border border-gray-100 rounded-xl overflow-hidden shadow-sm dark:bg-slate-900/40 dark:border-slate-800">
                <div class="grid grid-cols-1 divide-y divide-gray-100 dark:divide-slate-800">
                  <div class="flex items-center justify-between px-4 py-2.5 hover:bg-white transition-colors dark:hover:bg-slate-800/40">
                    <span class="text-[13px] font-medium text-gray-500 dark:text-slate-400">Size</span>
                    <span class="text-[13px] font-bold text-gray-900 dark:text-slate-200">{{ formatBytes(file()?.Size || 0) }}</span>
                  </div>
                  <div class="flex items-center justify-between px-4 py-2.5 hover:bg-white transition-colors dark:hover:bg-slate-800/40">
                    <span class="text-[13px] font-medium text-gray-500 dark:text-slate-400">Modified</span>
                    <span class="text-[13px] font-bold text-gray-900 dark:text-slate-200">{{ file()?.LastModified | date: 'MMM d, y, h:mm a' }}</span>
                  </div>
                  <div class="flex items-center justify-between px-4 py-2.5 hover:bg-white transition-colors dark:hover:bg-slate-800/40">
                    <span class="text-[13px] font-medium text-gray-500 dark:text-slate-400">Storage Class</span>
                    <span class="text-[13px] font-bold text-gray-900 dark:text-slate-200">{{ file()?.StorageClass || 'STANDARD' }}</span>
                  </div>
                  <div class="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-white transition-colors dark:hover:bg-slate-800/40">
                    <span class="text-[11px] font-semibold text-gray-400 opacity-80 uppercase tracking-tight dark:text-slate-500">ETag (MD5)</span>
                    <span class="text-[11px] font-mono text-gray-600 break-all select-all leading-tight dark:text-slate-400">{{ file()?.ETag | slice: 1 : -1 }}</span>
                  </div>
                  <div class="flex flex-col gap-0.5 px-4 py-3 hover:bg-white transition-colors dark:hover:bg-slate-800/40">
                    <span class="text-[11px] font-semibold text-gray-400 opacity-80 uppercase tracking-tight dark:text-slate-500">Full Path</span>
                    <span class="text-[11px] font-medium text-gray-500 break-all select-all leading-relaxed dark:text-slate-400">{{ file()?.Key }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="flex-1 flex flex-col items-center justify-center p-12 text-gray-300 bg-gray-50 dark:bg-slate-950 dark:text-slate-700">
          <div class="w-20 h-20 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center mb-6 dark:bg-slate-900 dark:border-slate-800">
            <svg class="w-10 h-10 text-gray-200 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <p class="text-base font-bold text-gray-400 dark:text-slate-500">Select an object to inspect</p>
          <p class="text-sm text-gray-300 mt-1 dark:text-slate-600">Properties and preview appear here</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .w-144 { width: 36rem; }
  `]
})
export class DetailsPanelComponent implements OnDestroy {
  /** Signal inputs — reactive by default, no ngOnChanges needed */
  file = input<_Object | null>(null);
  bucketName = input('');

  private s3Service = inject(S3Service);
  protected themeService = inject(ThemeService);

  copySuccess = signal(false);
  isDownloading = signal(false);

  isPreviewLoading = signal(false);
  isDecompressing = signal(false);
  previewContent = signal<string | null>(null);
  isClipped = signal(false);

  constructor() {
    // Replaces ngOnChanges — runs whenever file() changes
    effect(() => {
      const _ = this.file(); // track
      this.isDecompressing.set(false);
      this.fetchPreview();
    });
  }

  ngOnDestroy() { }

  getFileName(key?: string): string {
    if (!key) return 'Unknown File';
    const parts = key.split('/');
    return parts[parts.length - 1] || key;
  }

  isGzip(): boolean {
    return !!this.file()?.Key?.toLowerCase().endsWith('.gz');
  }

  isPreviewable(): boolean {
    if (!this.file()?.Key) return false;
    const key = this.file()!.Key!.toLowerCase();
    if (key.endsWith('.txt') || key.endsWith('.json') || key.endsWith('.md') || key.endsWith('.log') || key.endsWith('.js') || key.endsWith('.ts')) {
      return true;
    }
    if (this.isGzip()) return true;
    return false;
  }

  async decompressGzip() {
    if (!this.file()?.Key || !this.bucketName()) return;

    this.isDecompressing.set(true);
    try {
      // Fetch the first 256KB of the gzipped file
      const binaryData = await this.s3Service.getObjectBinaryRange(
        this.bucketName(),
        this.file()!.Key!,
        1024 * 256
      );

      // Start the worker for decompression
      const worker = new Worker(new URL('../../decompress.worker', import.meta.url));

      worker.onmessage = ({ data }) => {
        if (data.error) {
          console.error('Decompression error:', data.error);
          this.previewContent.set(`Failed to decompress: ${data.error}`);
        } else {
          let text = data.text;
          this.previewContent.set(text);
          this.isClipped.set(true); // Gzip preview is always "clipped" in this implementation
        }
        this.isDecompressing.set(false);
        worker.terminate();
      };

      worker.onerror = (err) => {
        console.error('Worker error:', err);
        this.previewContent.set('Worker failed to decompress content.');
        this.isDecompressing.set(false);
        worker.terminate();
      };

      worker.postMessage({ buffer: binaryData });
    } catch (err) {
      console.error('Failed to trigger decompression', err);
      this.isDecompressing.set(false);
    }
  }

  async fetchPreview() {
    this.previewContent.set(null);
    this.isClipped.set(false);

    if (!this.file()?.Key || !this.bucketName() || !this.isPreviewable()) {
      return;
    }

    if (this.isGzip()) {
      // We don't fetch .gz contents directly as text (it's binary)
      // The "Preview Unzipped" button will handle it.
      return;
    }

    this.isPreviewLoading.set(true);
    try {
      const { content, isClipped } = await this.s3Service.getObjectRange(
        this.bucketName(),
        this.file()!.Key!,
        1024 * 5
      );

      this.previewContent.set(content);
      this.isClipped.set(isClipped);
    } catch (err) {
      console.error('Failed to fetch preview', err);
      this.previewContent.set('Error: Could not load content preview.');
    } finally {
      this.isPreviewLoading.set(false);
    }
  }

  getLanguage(): string {
    if (!this.file()?.Key) return 'plaintext';
    let key = this.file()!.Key!.toLowerCase();

    // If it's a gzipped file, we check the extension BEFORE the .gz
    if (key.endsWith('.gz')) {
      key = key.slice(0, -3);
    }

    if (key.endsWith('.json')) return 'json';
    if (key.endsWith('.md')) return 'markdown';
    if (key.endsWith('.js')) return 'javascript';
    if (key.endsWith('.ts')) return 'typescript';
    return 'plaintext';
  }

  formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  async download() {
    if (!this.file()?.Key || !this.bucketName()) return;

    this.isDownloading.set(true);
    try {
      const blob = await this.s3Service.getObject(this.bucketName(), this.file()!.Key!);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.getFileName(this.file()!.Key);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
    } finally {
      this.isDownloading.set(false);
    }
  }

  copyS3Uri() {
    if (!this.file()?.Key || !this.bucketName()) return;

    const uri = `s3://${this.bucketName()}/${this.file()!.Key}`;
    navigator.clipboard.writeText(uri).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => {
        this.copySuccess.set(false);
      }, 2000);
    });
  }

  canFormat(): boolean {
    return this.getLanguage() === 'json';
  }

  formatContent() {
    const currentText = this.previewContent();
    if (!currentText) return;

    try {
      const parsed = JSON.parse(currentText);
      const formatted = JSON.stringify(parsed, null, 2);
      this.previewContent.set(formatted);
      // Editor will update via effect
    } catch (e) {
      console.warn('Content is not valid JSON, cannot format', e);
    }
  }
}
