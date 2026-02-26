import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonPrefix, _Object } from '@aws-sdk/client-s3';
import { S3Service, S3ListResult } from '../../services/s3.service';

@Component({
  selector: 'app-miller-column-list',
  standalone: true,
  template: `
    <div 
      class="h-full w-64 border-r border-gray-200 flex flex-col font-sans shrink-0 transition-all duration-300 dark:border-slate-800"
      [class.bg-white]="!isLastColumn"
      [class.dark:bg-slate-950]="!isLastColumn"
      [class.bg-indigo-50/30]="isLastColumn"
      [class.dark:bg-slate-900]="isLastColumn"
      [class.shadow-inner]="isLastColumn"
    >
      <!-- Column Header -->
      @if (title) {
        <div class="px-3 py-2 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider dark:text-slate-500">
            {{ title }}
          </span>
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
                [class.bg-blue-600]="isSelectedFolder(folder.Prefix!) && isLastColumn"
                [class.text-white]="isSelectedFolder(folder.Prefix!) && isLastColumn"
                [class.bg-blue-100/50]="isSelectedFolder(folder.Prefix!) && !isLastColumn"
                [class.text-blue-700]="isSelectedFolder(folder.Prefix!) && !isLastColumn"
                [class.dark:bg-indigo-900/40]="isSelectedFolder(folder.Prefix!) && !isLastColumn"
                [class.dark:text-indigo-300]="isSelectedFolder(folder.Prefix!) && !isLastColumn"
                [class.font-bold]="isSelectedFolder(folder.Prefix!) && isLastColumn"
                [class.hover:bg-gray-100]="!isSelectedFolder(folder.Prefix!)"
                [class.dark:hover:bg-slate-800/50]="!isSelectedFolder(folder.Prefix!)"
                [class.text-gray-700]="!isSelectedFolder(folder.Prefix!)"
                [class.dark:text-slate-400]="!isSelectedFolder(folder.Prefix!)"
                class="w-full text-left px-3 py-2 text-sm flex items-center justify-between group outline-none cursor-pointer transition-all border-l-2"
                [class.border-indigo-600]="isSelectedFolder(folder.Prefix!) && isLastColumn"
                [class.border-transparent]="!isSelectedFolder(folder.Prefix!) || !isLastColumn"
              >
                <div class="flex items-center gap-2 truncate">
                  <!-- Folder Icon -->
                  <svg
                    [class.text-blue-200]="isSelectedFolder(folder.Prefix!) && isLastColumn"
                    [class.text-blue-500]="!isSelectedFolder(folder.Prefix!) || !isLastColumn"
                    [class.dark:text-blue-400]="!isSelectedFolder(folder.Prefix!) || !isLastColumn"
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

          <!-- Files -->
          @for (file of objects(); track file.Key) {
            <li>
              <button
                (click)="onFileClick(file)"
                [class.bg-blue-600]="activeObject?.Key === file.Key && isLastColumn"
                [class.text-white]="activeObject?.Key === file.Key && isLastColumn"
                [class.bg-blue-100/50]="activeObject?.Key === file.Key && !isLastColumn"
                [class.text-blue-700]="activeObject?.Key === file.Key && !isLastColumn"
                [class.dark:bg-indigo-900/40]="activeObject?.Key === file.Key && !isLastColumn"
                [class.dark:text-indigo-300]="activeObject?.Key === file.Key && !isLastColumn"
                [class.font-bold]="activeObject?.Key === file.Key && isLastColumn"
                [class.hover:bg-gray-100]="activeObject?.Key !== file.Key"
                [class.dark:hover:bg-slate-800/50]="activeObject?.Key !== file.Key"
                [class.text-gray-700]="activeObject?.Key !== file.Key"
                [class.dark:text-slate-400]="activeObject?.Key !== file.Key"
                class="w-full text-left px-3 py-2 text-sm flex items-center gap-2 outline-none cursor-pointer transition-all border-l-2"
                [class.border-indigo-600]="activeObject?.Key === file.Key && isLastColumn"
                [class.border-transparent]="activeObject?.Key !== file.Key || !isLastColumn"
              >
                <!-- File Icon -->
                <svg
                  [class.text-blue-200]="activeObject?.Key === file.Key && isLastColumn"
                  [class.text-gray-400]="activeObject?.Key !== file.Key"
                  [class.dark:text-slate-500]="activeObject?.Key !== file.Key"
                  [class.text-blue-500]="activeObject?.Key === file.Key && !isLastColumn"
                  [class.dark:text-blue-400]="activeObject?.Key === file.Key && !isLastColumn"
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
export class MillerColumnListComponent implements OnInit, OnChanges {
  @Input({ required: true }) bucket!: string;
  @Input() prefix = '';
  @Input() title?: string;
  @Input() activeNextPrefix: string | null = null;
  @Input() activeObject: _Object | null = null;

  @Input() isLastColumn = false;

  @Output() folderSelected = new EventEmitter<string>();
  @Output() fileSelected = new EventEmitter<_Object>();

  private s3Service = inject(S3Service);

  prefixes = signal<CommonPrefix[]>([]);
  objects = signal<_Object[]>([]);
  isLoading = signal(false);

  private nextToken: string | undefined = undefined;
  private hasMore = true;

  ngOnInit() {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['bucket'] || changes['prefix']) {
      // If bucket or prefix changed, and it's not the first change
      const bucketChanged = changes['bucket'] && !changes['bucket'].isFirstChange();
      const prefixChanged = changes['prefix'] && !changes['prefix'].isFirstChange();

      if (bucketChanged || prefixChanged) {
        this.resetAndLoad();
      }
    }
  }

  private resetAndLoad() {
    this.prefixes.set([]);
    this.objects.set([]);
    this.nextToken = undefined;
    this.hasMore = true;
    this.loadData();
  }

  async loadData() {
    console.log(`[MillerColumnList] loadData for bucket: ${this.bucket}, prefix: ${this.prefix}`);
    if (this.isLoading() || !this.hasMore || !this.bucket) {
      console.log(`[MillerColumnList] loadData skipped: isLoading=${this.isLoading()}, hasMore=${this.hasMore}, bucket=${this.bucket}`);
      return;
    }

    this.isLoading.set(true);
    try {
      const result: S3ListResult = await this.s3Service.listObjects(
        this.bucket,
        this.prefix,
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
    // Check for folder representation (ends with /)
    if (parts.length > 1 && parts[parts.length - 1] === '') {
      // Return the named part, or "/" for the special case where prefix is exactly "/"
      return parts[parts.length - 2] || '/';
    }
    return parts[parts.length - 1];
  }

  getFileName(key: string): string {
    const parts = key.split('/');
    return parts[parts.length - 1];
  }

  isSelectedFolder(folderPrefix: string): boolean {
    return this.activeNextPrefix === folderPrefix;
  }

  onFolderClick(folder: CommonPrefix) {
    if (folder.Prefix) {
      this.folderSelected.emit(folder.Prefix);
    }
  }

  onFileClick(file: _Object) {
    this.fileSelected.emit(file);
  }
}
