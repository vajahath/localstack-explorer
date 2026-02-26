import {
  Component,
  inject,
  signal,
  input,
  output,
  effect,
  untracked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonPrefix, _Object } from '@aws-sdk/client-s3';
import { S3Service, S3ListResult, UploadProgressCallback } from '../../services/s3.service';

@Component({
  selector: 'app-miller-column-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="h-full w-64 border-r border-gray-200 flex flex-col font-sans shrink-0 transition-all duration-300 dark:border-slate-800 relative"
      [class.bg-white]="!isLastColumn()"
      [class.dark:bg-slate-950]="!isLastColumn()"
      [class.bg-indigo-50/30]="isLastColumn()"
      [class.dark:bg-slate-900]="isLastColumn()"
      [class.shadow-inner]="isLastColumn()"
      [class.ring-2]="isDragOver()"
      [class.ring-inset]="isDragOver()"
      [class.ring-blue-500]="isDragOver()"
      [class.bg-blue-50]="isDragOver()"
      [class.dark:bg-blue-900]="isDragOver()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      @if (isDragOver()) {
        <div class="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 border-2 border-blue-500/50 border-dashed z-[100] pointer-events-none flex flex-col items-center justify-center">
           <svg class="w-10 h-10 text-blue-500 opacity-70 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
           <span class="text-sm font-bold text-blue-600 dark:text-blue-400 opacity-80">Drop files here</span>
           <span class="text-[10px] text-blue-500 dark:text-blue-300 opacity-70 absolute bottom-4 max-w-[80%] text-center truncate">To: {{ prefix() || '/' }}</span>
        </div>
      }
      <!-- Column Header -->
      @if (title()) {
        <div class="px-3 py-2 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 shrink-0 flex items-center justify-between group/header">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider dark:text-slate-500 truncate" [title]="title()">
            {{ title() }}
          </span>
          <div class="flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 focus-within:opacity-100 transition-opacity">
            <button (click)="isCreatingFolder.set(true)" class="text-blue-500 hover:text-blue-600 outline-none p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Create folder">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
            </button>
            <button (click)="fileInput.click()" class="text-blue-500 hover:text-blue-600 outline-none p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Upload to this folder">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            </button>
            <input type="file" multiple class="hidden" #fileInput (change)="onFileSelected($event)" />
          </div>
        </div>
      }

      <!-- Create Folder Input -->
      @if (isCreatingFolder()) {
        <div class="px-3 py-2 border-b border-gray-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/20 shrink-0 flex items-center gap-2">
          <input
            #folderInput
            type="text"
            placeholder="Folder name..."
            class="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 text-xs text-gray-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
            (keyup.enter)="createFolder(folderInput.value)"
            (keyup.escape)="isCreatingFolder.set(false)"
            (blur)="isCreatingFolder.set(false)"
            [disabled]="isCreatingFolderSaving()"
            autofocus
          />
          @if (isCreatingFolderSaving()) {
            <svg class="animate-spin h-3.5 w-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          }
        </div>
      }

      <!-- Loading indicator -->
      @if (isLoading() && prefixes().length === 0 && objects().length === 0) {
        <div class="flex-1 flex items-center justify-center text-gray-400 dark:text-slate-600">
          <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      }

      <div class="flex-1 overflow-y-auto outline-none" (scroll)="onScroll($event)">
        <ul class="py-1">
          <!-- Folders -->
          @for (folder of prefixes(); track folder.Prefix) {
            <li>
              <button
                (click)="onFolderClick(folder)"
                [class.bg-blue-600]="isSelectedFolder(folder.Prefix!) && isLastColumn()"
                [class.text-white]="isSelectedFolder(folder.Prefix!) && isLastColumn()"
                [class.bg-blue-100/50]="isSelectedFolder(folder.Prefix!) && !isLastColumn()"
                [class.text-blue-700]="isSelectedFolder(folder.Prefix!) && !isLastColumn()"
                [class.dark:bg-indigo-900/40]="isSelectedFolder(folder.Prefix!) && !isLastColumn()"
                [class.dark:text-indigo-300]="isSelectedFolder(folder.Prefix!) && !isLastColumn()"
                [class.font-bold]="isSelectedFolder(folder.Prefix!) && isLastColumn()"
                [class.hover:bg-gray-100]="!isSelectedFolder(folder.Prefix!)"
                [class.dark:hover:bg-slate-800/50]="!isSelectedFolder(folder.Prefix!)"
                [class.text-gray-700]="!isSelectedFolder(folder.Prefix!)"
                [class.dark:text-slate-400]="!isSelectedFolder(folder.Prefix!)"
                class="w-full text-left px-3 py-2 text-sm flex items-center justify-between group outline-none cursor-pointer transition-all border-l-2"
                [class.border-indigo-600]="isSelectedFolder(folder.Prefix!) && isLastColumn()"
                [class.border-transparent]="!isSelectedFolder(folder.Prefix!) || !isLastColumn()"
              >
                <div class="flex items-center gap-2 truncate">
                   <!-- Folder Icon -->
                  <svg
                    [class.text-blue-200]="isSelectedFolder(folder.Prefix!) && isLastColumn()"
                    [class.text-blue-500]="!isSelectedFolder(folder.Prefix!) || !isLastColumn()"
                    [class.dark:text-blue-400]="!isSelectedFolder(folder.Prefix!) || !isLastColumn()"
                    class="w-4 h-4 shrink-0 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    ></path>
                  </svg>
                  <span class="truncate">{{ getFolderName(folder.Prefix!) }}</span>
                </div>
                <!-- Chevron -->
                <svg
                  [class.opacity-100]="isSelectedFolder(folder.Prefix!)"
                  class="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  ></path>
                </svg>
              </button>
            </li>
          }

          <!-- Uploading Files -->
          @for (file of uploadingFiles(); track file.name) {
            <li>
              <div class="w-full text-left px-3 py-2 text-sm flex items-center gap-2 outline-none transition-all border-l-2 border-transparent bg-gray-50 dark:bg-slate-900 opacity-60 pointer-events-none">
                <svg class="w-4 h-4 shrink-0 text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                <div class="flex-1 min-w-0">
                   <div class="flex items-center justify-between gap-2">
                     <span class="truncate text-gray-500 dark:text-slate-400">{{ file.name }}</span>
                     <span class="text-[10px] text-blue-500 dark:text-blue-400 font-bold tabular-nums shrink-0">{{ formatProgress(file.progress) }}</span>
                   </div>
                   <div class="h-1 w-full bg-gray-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                     <div class="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300 ease-out" [style.width.%]="file.progress * 100"></div>
                   </div>
                </div>
              </div>
            </li>
          }

          <!-- Files -->
          @for (file of objects(); track file.Key) {
            <li>
              <button
                (click)="onFileClick(file)"
                [class.bg-blue-600]="activeObject()?.Key === file.Key && isLastColumn()"
                [class.text-white]="activeObject()?.Key === file.Key && isLastColumn()"
                [class.bg-blue-100/50]="activeObject()?.Key === file.Key && !isLastColumn()"
                [class.text-blue-700]="activeObject()?.Key === file.Key && !isLastColumn()"
                [class.dark:bg-indigo-900/40]="activeObject()?.Key === file.Key && !isLastColumn()"
                [class.dark:text-indigo-300]="activeObject()?.Key === file.Key && !isLastColumn()"
                [class.font-bold]="activeObject()?.Key === file.Key && isLastColumn()"
                [class.hover:bg-gray-100]="activeObject()?.Key !== file.Key"
                [class.dark:hover:bg-slate-800/50]="activeObject()?.Key !== file.Key"
                [class.text-gray-700]="activeObject()?.Key !== file.Key"
                [class.dark:text-slate-400]="activeObject()?.Key !== file.Key"
                class="w-full text-left px-3 py-2 text-sm flex items-center gap-2 outline-none cursor-pointer transition-all border-l-2"
                [class.border-indigo-600]="activeObject()?.Key === file.Key && isLastColumn()"
                [class.border-transparent]="activeObject()?.Key !== file.Key || !isLastColumn()"
              >
                <!-- File Icon -->
                @if (isImageFile(file.Key!)) {
                  <svg
                    [class.text-blue-200]="activeObject()?.Key === file.Key && isLastColumn()"
                    [class.text-indigo-400]="activeObject()?.Key !== file.Key"
                    [class.dark:text-indigo-500]="activeObject()?.Key !== file.Key"
                    [class.text-indigo-500]="activeObject()?.Key === file.Key && !isLastColumn()"
                    [class.dark:text-indigo-400]="activeObject()?.Key === file.Key && !isLastColumn()"
                    class="w-4 h-4 shrink-0 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                } @else {
                  <svg
                    [class.text-blue-200]="activeObject()?.Key === file.Key && isLastColumn()"
                    [class.text-gray-400]="activeObject()?.Key !== file.Key"
                    [class.dark:text-slate-500]="activeObject()?.Key !== file.Key"
                    [class.text-blue-500]="activeObject()?.Key === file.Key && !isLastColumn()"
                    [class.dark:text-blue-400]="activeObject()?.Key === file.Key && !isLastColumn()"
                    class="w-4 h-4 shrink-0 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    ></path>
                  </svg>
                }
                <span class="truncate">{{ getFileName(file.Key!) }}</span>
              </button>
            </li>
          }
        </ul>

        <!-- Loading more indicator -->
        @if (isLoading() && (prefixes().length > 0 || objects().length > 0)) {
          <div class="py-3 flex justify-center">
            <div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
          </div>
        }
      </div>
    </div>
  `,
})
export class MillerColumnListComponent {
  bucket = input.required<string>();
  prefix = input<string>('');
  title = input<string>();
  activeNextPrefix = input<string | null>(null);
  activeObject = input<_Object | null>(null);
  isLastColumn = input<boolean>(false);

  folderSelected = output<string>();
  fileSelected = output<_Object>();

  private s3Service = inject(S3Service);

  prefixes = signal<CommonPrefix[]>([]);
  objects = signal<_Object[]>([]);
  isLoading = signal(false);

  isDragOver = signal(false);
  uploadingFiles = signal<{ name: string; progress: number }[]>([]);
  isCreatingFolder = signal(false);
  isCreatingFolderSaving = signal(false);

  private nextToken: string | undefined = undefined;
  private hasMore = true;

  constructor() {
    effect(() => {
      // Re-load data when bucket or prefix changes
      this.bucket();
      this.prefix();

      untracked(() => {
        this.resetAndLoad();
      });
    });
  }

  private resetAndLoad() {
    this.prefixes.set([]);
    this.objects.set([]);
    this.nextToken = undefined;
    this.hasMore = true;
    this.loadData();
  }

  async loadData() {
    const bucket = this.bucket();
    const prefix = this.prefix();

    console.log(`[MillerColumnList] loadData for bucket: ${bucket}, prefix: ${prefix}`);
    if (this.isLoading() || !this.hasMore || !bucket) {
      return;
    }

    this.isLoading.set(true);
    try {
      const result: S3ListResult = await this.s3Service.listObjects(
        bucket,
        prefix,
        this.nextToken,
      );

      this.prefixes.update((p) => [...p, ...result.prefixes]);
      this.objects.update((o) => [...o, ...result.objects]);

      this.nextToken = result.nextContinuationToken;
      this.hasMore = !!this.nextToken;
    } catch (error) {
      console.error('Error loading column data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onScroll(event: Event) {
    const target = event.target as HTMLElement;
    // Trigger load when within 50px of bottom
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      this.loadData();
    }
  }

  getFolderName(fullPrefix: string): string {
    const parts = fullPrefix.split('/');
    if (parts.length > 1 && parts[parts.length - 1] === '') {
      return parts[parts.length - 2] || '/';
    }
    return parts[parts.length - 1];
  }

  getFileName(key: string): string {
    const parts = key.split('/');
    return parts[parts.length - 1];
  }

  isSelectedFolder(folderPrefix: string): boolean {
    return this.activeNextPrefix() === folderPrefix;
  }

  onFolderClick(folder: CommonPrefix) {
    if (folder.Prefix) {
      this.folderSelected.emit(folder.Prefix);
    }
  }

  onFileClick(file: _Object) {
    this.fileSelected.emit(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    // Prevent flicker due to child elements
    const target = event.target as HTMLElement;
    const related = event.relatedTarget as HTMLElement;
    if (related && target.contains(related)) {
      return;
    }
    this.isDragOver.set(false);
  }

  async onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    if (event.dataTransfer?.files?.length) {
      await this.handleUploadFiles(Array.from(event.dataTransfer.files));
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      await this.handleUploadFiles(Array.from(input.files));
      input.value = ''; // Reset input to allow re-selecting the same file if needed
    }
  }

  private async handleUploadFiles(files: File[]) {
    const bucket = this.bucket();
    const prefix = this.prefix();
    if (!bucket) return;

    const newUploads = files.map(f => ({ name: f.name, progress: 0 }));
    this.uploadingFiles.update(u => [...u, ...newUploads]);

    const uploadPromises = files.map(async file => {
      const key = prefix + file.name;
      const onProgress: UploadProgressCallback = (progress) => {
        this.uploadingFiles.update(u =>
          u.map(f => f.name === file.name ? { ...f, progress } : f)
        );
      };
      try {
        await this.s3Service.uploadObject(bucket, key, file, onProgress);
      } catch (err) {
        console.error('Upload failed for', file.name, err);
      } finally {
        this.uploadingFiles.update(u => u.filter(f => f.name !== file.name));
      }
    });

    await Promise.all(uploadPromises);
    // Reload data to correctly fetch the newly added components while maintaining sorting and paging state logic
    this.resetAndLoad();
  }

  async createFolder(folderName: string) {
    folderName = folderName.trim();
    if (!folderName) {
      this.isCreatingFolder.set(false);
      return;
    }

    const bucket = this.bucket();
    const prefix = this.prefix();
    if (!bucket) return;

    this.isCreatingFolderSaving.set(true);
    try {
      await this.s3Service.createFolder(bucket, prefix, folderName);
      this.isCreatingFolder.set(false);
      this.resetAndLoad();
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      this.isCreatingFolderSaving.set(false);
    }
  }

  formatProgress(progress: number): string {
    return Math.round(progress * 100) + '%';
  }

  isImageFile(key: string): boolean {
    const k = key.toLowerCase();
    return k.endsWith('.png') || k.endsWith('.jpg') || k.endsWith('.jpeg') || k.endsWith('.webp');
  }
}
