import { Component, OnDestroy, inject, input, signal, effect, computed } from '@angular/core';
import { _Object } from '@aws-sdk/client-s3';
import { DatePipe, SlicePipe } from '@angular/common';
import { S3Service } from '../../services/s3.service';
import { ThemeService } from '../../services/theme.service';
import { MonacoEditorComponent } from '../monaco-editor/monaco-editor';
import { ObjectMetadataEditorComponent } from '../object-metadata-editor/object-metadata-editor';
import { StateService } from '../../services/state.service';
import { getEmojiForKey } from '../../utils/extension-emoji';

@Component({
  selector: 'app-details-panel',
  standalone: true,
  imports: [DatePipe, SlicePipe, MonacoEditorComponent, ObjectMetadataEditorComponent],
  template: `
    <div
      class="h-full bg-white border-l border-gray-200 flex flex-col w-144 font-sans transition-all duration-300 shadow-xl overflow-hidden dark:bg-slate-950 dark:border-slate-800"
    >
      @if (file()) {
        <!-- Header -->
        <div
          class="px-6 py-4 bg-white border-b border-gray-100 shrink-0 shadow-sm z-10 dark:bg-slate-950 dark:border-slate-800"
        >
          <h3
            class="text-xl font-bold text-gray-900 dark:text-slate-50 flex items-start gap-3"
            [title]="file()?.Key"
          >
            <span
              class="inline-flex items-center justify-center w-6 h-6 flex-shrink-0 text-2xl leading-none"
            >{{ getEmojiForKey(file()?.Key) }}</span>
            <span class="break-words whitespace-normal text-base leading-tight">{{ getFileName(file()?.Key) }}</span>
          </h3>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto">
          <!-- 1. FULL WIDTH PREVIEW (Top Priority) -->
          <div
            class="bg-gray-50 border-b border-gray-200 relative group min-h-[400px] dark:bg-slate-900 dark:border-slate-800"
            [class.h-96]="isPreviewable() || previewContent() || previewImageUrl()"
          >
            @if (isPreviewLoading()) {
              <div
                class="absolute inset-0 flex items-center justify-center bg-gray-50/80 z-20 transition-opacity dark:bg-slate-900/90"
              >
                <span class="inline-flex items-center justify-center text-3xl leading-none"
                  >⏳</span
                >
              </div>
            }

            <!-- Image Preview -->
            @if (isImage() && previewImageUrl()) {
              <div class="w-full h-full flex items-center justify-center p-4">
                <img
                  [src]="previewImageUrl()"
                  class="max-w-full max-h-full object-contain rounded-sm shadow-sm"
                  alt="Object preview"
                />
              </div>
            }

            <!-- Monaco Editor Container with Deferred Loading -->
            @if (previewContent() !== null && !isImage()) {
              @defer (on timer(100ms)) {
                <app-monaco-editor
                  [content]="previewContent()!"
                  [language]="getLanguage()"
                  class="w-full h-full"
                ></app-monaco-editor>
              } @loading {
                <div
                  class="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-slate-900/50"
                >
                  <div class="text-xs font-bold text-blue-500 animate-pulse">
                    Initializing Editor...
                  </div>
                </div>
              } @placeholder {
                <div
                  class="w-full h-full bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800"
                ></div>
              }
            }

            @if (!previewContent() && !previewImageUrl() && !isPreviewLoading()) {
              <div
                class="absolute inset-0 flex flex-col items-center justify-center p-12 text-gray-400 bg-gray-50 z-10 dark:bg-slate-900 dark:text-slate-500"
              >
                <div
                  class="w-12 h-12 mb-3 text-gray-300 dark:text-slate-700 inline-flex items-center justify-center text-2xl"
                >
                  {{ getEmojiForKey(file()?.Key) }}
                </div>
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
                        <span class="inline-flex items-center justify-center text-sm leading-none"
                          >⏳</span
                        >
                        Unzipping...
                      } @else {
                        <span class="inline-flex items-center justify-center w-3.5 h-3.5">🫣</span>
                        Preview Unzipped
                      }
                    </button>
                  }
                </div>
              </div>
            }

            @if (isClipped() && (previewContent() || previewImageUrl())) {
              <div
                class="absolute bottom-3 right-3 px-3 py-1.5 bg-amber-50/90 backdrop-blur-sm border border-amber-200 text-amber-800 text-[10px] font-bold rounded-lg shadow-sm z-30 flex items-center gap-2 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-400"
              >
                <span class="inline-flex items-center justify-center w-3 h-3 text-amber-500"
                  >⚠️</span
                >
                {{
                  isGzip()
                    ? 'Decompressed Preview (First 256KB raw)'
                    : isImage()
                      ? 'Image Preview'
                      : 'Clipped (First 5KB)'
                }}
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
                  <span
                    class="inline-flex items-center justify-center w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors"
                    >🧹</span
                  >
                  Format
                </button>
              }

              <button
                (click)="download()"
                [disabled]="isDownloading()"
                class="flex-1 group flex items-center justify-center gap-2.5 px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white text-sm font-bold rounded-xl transition-all cursor-pointer active:scale-[0.97] shadow-lg shadow-blue-50 dark:shadow-none"
              >
                <span
                  class="inline-flex items-center justify-center w-5 h-5 text-blue-100 group-hover:text-white transition-colors"
                  [class.animate-bounce]="isDownloading()"
                  >📥</span
                >
                Download
              </button>

              <button
                (click)="copyS3Uri()"
                class="group flex items-center justify-center gap-2.5 px-5 py-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-sm font-bold rounded-xl border border-gray-200 transition-all cursor-pointer active:scale-[0.97] dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-300"
                [title]="'Copy S3 URI'"
              >
                <span
                  class="inline-flex items-center justify-center w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors dark:text-slate-500"
                  >📋</span
                >
                {{ copySuccess() ? 'Copied' : 'Copy URI' }}
              </button>
            </div>

            <app-object-metadata-editor
              [bucketName]="bucketName()"
              [objectKey]="file()!.Key!"
              (metadataUpdated)="onMetadataUpdated()"
            ></app-object-metadata-editor>

            <div class="space-y-3 pt-4">
              <h4
                class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1 dark:text-slate-500"
              >
                Detailed Properties
              </h4>
              <div
                class="bg-gray-50/50 border border-gray-100 rounded-xl overflow-hidden shadow-sm dark:bg-slate-900/40 dark:border-slate-800"
              >
                <div class="grid grid-cols-1 divide-y divide-gray-100 dark:divide-slate-800">
                  <div
                    class="flex items-center justify-between px-4 py-2.5 hover:bg-white transition-colors dark:hover:bg-slate-800/40"
                  >
                    <span class="text-[13px] font-medium text-gray-500 dark:text-slate-400"
                      >Size</span
                    >
                    <span class="text-[13px] font-bold text-gray-900 dark:text-slate-200">{{
                      formatBytes(file()?.Size || 0)
                    }}</span>
                  </div>
                  <div
                    class="flex items-center justify-between px-4 py-2.5 hover:bg-white transition-colors dark:hover:bg-slate-800/40"
                  >
                    <span class="text-[13px] font-medium text-gray-500 dark:text-slate-400"
                      >Modified</span
                    >
                    <span class="text-[13px] font-bold text-gray-900 dark:text-slate-200">{{
                      file()?.LastModified | date: 'MMM d, y, h:mm a'
                    }}</span>
                  </div>
                  <div
                    class="flex items-center justify-between px-4 py-2.5 hover:bg-white transition-colors dark:hover:bg-slate-800/40"
                  >
                    <span class="text-[13px] font-medium text-gray-500 dark:text-slate-400"
                      >Storage Class</span
                    >
                    <span class="text-[13px] font-bold text-gray-900 dark:text-slate-200">{{
                      file()?.StorageClass || 'STANDARD'
                    }}</span>
                  </div>
                  <div
                    class="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-white transition-colors dark:hover:bg-slate-800/40"
                  >
                    <span
                      class="text-[11px] font-semibold text-gray-400 opacity-80 uppercase tracking-tight dark:text-slate-500"
                      >ETag (MD5)</span
                    >
                    <span
                      class="text-[11px] font-mono text-gray-600 break-all select-all leading-tight dark:text-slate-400"
                      >{{ file()?.ETag | slice: 1 : -1 }}</span
                    >
                  </div>
                  <div
                    class="flex flex-col gap-0.5 px-4 py-3 hover:bg-white transition-colors dark:hover:bg-slate-800/40"
                  >
                    <span
                      class="text-[11px] font-semibold text-gray-400 opacity-80 uppercase tracking-tight dark:text-slate-500"
                      >Full Path</span
                    >
                    <span
                      class="text-[11px] font-medium text-gray-500 break-all select-all leading-relaxed dark:text-slate-400"
                      >{{ file()?.Key }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div
          class="flex-1 flex flex-col items-center justify-center p-12 text-gray-300 bg-gray-50 dark:bg-slate-950 dark:text-slate-700"
        >
          <div
            class="w-20 h-20 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center mb-6 dark:bg-slate-900 dark:border-slate-800"
          >
            <div
              class="w-10 h-10 text-gray-200 dark:text-slate-700 inline-flex items-center justify-center text-2xl"
            >
              ℹ️
            </div>
          </div>
          <p class="text-base font-bold text-gray-400 dark:text-slate-500">
            Select an object to inspect
          </p>
          <p class="text-sm text-gray-300 mt-1 dark:text-slate-600">
            Properties and preview appear here
          </p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .w-144 {
        width: 36rem;
      }
    `,
  ],
})
export class DetailsPanelComponent implements OnDestroy {
  /** Signal inputs — reactive by default, no ngOnChanges needed */
  file = input<_Object | null>(null);
  bucketName = input('');

  private s3Service = inject(S3Service);
  protected themeService = inject(ThemeService);

  private stateService = inject(StateService);

  copySuccess = signal(false);
  isDownloading = signal(false);

  // expose shared helper for templates
  getEmojiForKey = getEmojiForKey;

  isPreviewLoading = signal(false);
  isDecompressing = signal(false);
  previewContent = signal<string | null>(null);
  previewImageUrl = signal<string | null>(null);
  isClipped = signal(false);

  isImage = computed(() => {
    const key = this.file()?.Key?.toLowerCase();
    return !!(
      key?.endsWith('.png') ||
      key?.endsWith('.jpg') ||
      key?.endsWith('.jpeg') ||
      key?.endsWith('.webp')
    );
  });

  constructor() {
    // Replaces ngOnChanges — runs whenever file() changes
    effect(() => {
      const _ = this.file(); // track
      this.isDecompressing.set(false);
      this.fetchPreview();
    });
  }

  ngOnDestroy() {
    this.revokePreviewUrl();
  }

  private revokePreviewUrl() {
    // Only revoke if we actually created an Object URL (e.g. from local blobs in the future),
    // but with presigned URLs we don't need to revoke. Still, clearing the state is good.
    this.previewImageUrl.set(null);
  }

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
    if (
      key.endsWith('.txt') ||
      key.endsWith('.json') ||
      key.endsWith('.md') ||
      key.endsWith('.log') ||
      key.endsWith('.js') ||
      key.endsWith('.ts')
    ) {
      return true;
    }
    if (this.isGzip() || this.isImage()) return true;
    return false;
  }

  async decompressGzip() {
    if (!this.file()?.Key || !this.bucketName()) return;

    this.isDecompressing.set(true);
    try {
      // Fetch the first 256KB of the gzipped file
      const FETCH_BYTES = 1024 * 256;
      const binaryData = await this.s3Service.getObjectBinaryRange(
        this.bucketName(),
        this.file()!.Key!,
        FETCH_BYTES,
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
          // Only mark as clipped if the compressed object is larger than the fetched bytes
          const totalCompressedSize = this.file()?.Size ?? 0;
          this.isClipped.set(totalCompressedSize > FETCH_BYTES);
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
    this.revokePreviewUrl();
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
      if (this.isImage()) {
        const url = await this.s3Service.getPresignedUrl(this.bucketName(), this.file()!.Key!);
        this.previewImageUrl.set(url);
      } else {
        const { content, isClipped } = await this.s3Service.getObjectRange(
          this.bucketName(),
          this.file()!.Key!,
          1024 * 5,
        );

        this.previewContent.set(content);
        this.isClipped.set(isClipped);
      }
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

  async onMetadataUpdated() {
    const bucket = this.bucketName();
    const key = this.file()?.Key;
    if (!bucket || !key) return;

    try {
      const updatedObject = await this.s3Service.headObject(bucket, key);
      this.stateService.activeObject.set(updatedObject);
    } catch (err) {
      console.error('Failed to sync updated object metadata', err);
    }
  }
}
