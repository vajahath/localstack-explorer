import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  inject,
  OnDestroy,
  ChangeDetectorRef,
  signal,
  input,
  output,
  computed,
  effect,
  untracked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { _Object } from '@aws-sdk/client-s3';
import { StateService } from '../../services/state.service';
import { MillerColumnListComponent } from '../miller-column-list/miller-column-list';

@Component({
  selector: 'app-miller-columns',
  standalone: true,
  imports: [MillerColumnListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-950 overflow-hidden relative border-r border-gray-200 dark:border-slate-800">
      <!-- Workspace area with columns -->
      <div
        class="flex-1 flex overflow-x-auto overflow-y-hidden hide-scrollbar"
        #scrollContainer
        (scroll)="onMainScroll($event)"
      >
        <!-- Root Column -->
        <app-miller-column-list
          [bucket]="bucket()"
          prefix=""
          title="(root)"
          [activeNextPrefix]="columns().length > 0 ? columns()[0] : null"
          [activeObject]="isRootObjectActive() ? stateService.activeObject() : null"
          [isLastColumn]="columns().length === 0"
          (folderSelected)="onPrefixSelected($event, 0)"
          (fileSelected)="onFileSelected($event, 0)"
        ></app-miller-column-list>

        <!-- Nested Columns -->
        @for (col of columns(); track col; let i = $index) {
          <app-miller-column-list
            animate.enter="column-slide-in"
            [bucket]="bucket()"
            [prefix]="col"
            [title]="getFolderName(col)"
            [activeNextPrefix]="columns().length > i + 1 ? columns()[i + 1] : null"
            [activeObject]="isObjectActiveInColumn(col) ? stateService.activeObject() : null"
            [isLastColumn]="i === columns().length - 1"
            (folderSelected)="onPrefixSelected($event, i + 1)"
            (fileSelected)="onFileSelected($event, i + 1)"
          ></app-miller-column-list>
        }
      </div>

      <!-- Path Breadcrumb Footer -->
      <div class="h-10 border-t border-gray-200 bg-white flex items-center px-4 shrink-0 z-20 shadow-sm overflow-x-auto hide-scrollbar dark:bg-slate-950 dark:border-slate-800">
        <div class="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 w-full whitespace-nowrap dark:text-slate-500">
             <div class="w-3.5 h-3.5 text-gray-300 shrink-0 dark:text-slate-600">📁</div>
             <button 
                (click)="navigateToDepth(-1)"
                class="hover:text-blue-500 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-all cursor-pointer shrink-0 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
             >
                {{ bucket() }}
             </button>
             
             @for (part of stateService.selectedPathParts(); track part; let i = $index) {
                <span class="text-gray-300 shrink-0 dark:text-slate-700">/</span>
                <button 
                    (click)="navigateToDepth(i)"
                    class="text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-all cursor-pointer truncate max-w-[150px] dark:text-slate-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                    [title]="part"
                >
                    {{ part }}
                </button>
             }

             @if (stateService.activeObject()) {
               <span class="text-gray-300 shrink-0 dark:text-slate-700">/</span>
               <span class="text-blue-600 font-bold px-1.5 py-0.5 truncate max-w-[200px] dark:text-blue-400">{{ getFileName(stateService.activeObject()?.Key ?? '') }}</span>
             }
        </div>
      </div>

      <!-- Visible Horizontal Scrollbar Area -->
      <div class="h-3 bg-slate-100 border-t border-slate-200 overflow-x-scroll custom-scrollbar shrink-0 z-30 dark:bg-slate-900 dark:border-slate-800" 
           (scroll)="onManualScroll($event)"
           #manualScrollbar>
          <div [style.width.px]="scrollWidth()" class="h-px"></div>
      </div>
    </div>
  `,
  styles: [
    `
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .custom-scrollbar::-webkit-scrollbar {
        height: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #94a3b8;
        border-radius: 10px;
        border: 2px solid transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #64748b;
      }
      :host-context(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #334155;
      }
      :host-context(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #475569;
      }
      :host {
        display: flex;
        flex: 1;
        overflow: hidden;
        min-width: 0;
      }

      .column-slide-in {
        animation: slideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }

      @keyframes slideIn {
        from {
          transform: translateX(20px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class MillerColumnsComponent implements OnInit, OnDestroy {
  bucket = input.required<string>();

  protected stateService = inject(StateService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('manualScrollbar') manualScrollbar!: ElementRef<HTMLElement>;

  columns = computed(() => {
    const parts = this.stateService.selectedPathParts();
    const cols: string[] = [];
    let currentPrefix = '';
    for (const part of parts) {
      currentPrefix += part + '/';
      cols.push(currentPrefix);
    }
    return cols;
  });

  scrollWidth = signal(0);

  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private shouldScrollToRight = false;
  private isSyncingScroll = false;

  constructor() {
    effect(() => {
      // Sync on bucket change or path parts change
      this.bucket();
      this.stateService.selectedPathParts();

      untracked(() => {
        this.shouldScrollToRight = true;
        // Trigger update for navigation path changes
        setTimeout(() => this.updateScrollWidth(), 0);
      });
    });
  }

  ngOnInit() {
    this.initObservers();
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
  }

  private initObservers() {
    // Detect layout changes (resizes)
    this.resizeObserver = new ResizeObserver(() => this.updateScrollWidth());

    // Detect content changes (new columns added/removed)
    this.mutationObserver = new MutationObserver(() => this.updateScrollWidth());

    setTimeout(() => {
      if (this.scrollContainer) {
        this.resizeObserver?.observe(this.scrollContainer.nativeElement);
        this.mutationObserver?.observe(this.scrollContainer.nativeElement, {
          childList: true,
          subtree: false
        });

        // Initial calculation
        this.updateScrollWidth();
      }
    }, 0);
  }

  private updateScrollWidth() {
    if (this.scrollContainer) {
      const container = this.scrollContainer.nativeElement;
      const newWidth = container.scrollWidth;

      if (this.scrollWidth() !== newWidth) {
        this.scrollWidth.set(newWidth);

        // Ensure manual scrollbar handles are updated
        setTimeout(() => {
          this.cdr.detectChanges();

          if (this.shouldScrollToRight) {
            this.scrollToRightEdge();
            this.shouldScrollToRight = false;
          }

          // Force sync scroll positions after width update
          if (this.manualScrollbar) {
            this.manualScrollbar.nativeElement.scrollLeft = container.scrollLeft;
          }
        }, 0);
      }
    }
  }

  onPrefixSelected(prefix: string, depth: number) {
    const parts = prefix.split('/').filter((p) => p !== '');
    this.stateService.navigatePath(parts);
    this.stateService.activeObject.set(null);
  }

  onFileSelected(file: _Object, depth: number) {
    this.stateService.activeObject.set(file);
    const parts = this.stateService.selectedPathParts().slice(0, depth);

    setTimeout(() => {
      this.stateService.navigatePath(parts);
      this.updateScrollWidth();
    }, 0);
  }

  navigateToDepth(depth: number) {
    const parts = this.stateService.selectedPathParts().slice(0, depth + 1);
    this.stateService.navigatePath(parts);
    this.stateService.activeObject.set(null);
  }

  isRootObjectActive(): boolean {
    const active = this.stateService.activeObject();
    if (!active?.Key) return false;
    return !active.Key.includes('/');
  }

  isObjectActiveInColumn(columnPrefix: string): boolean {
    const active = this.stateService.activeObject();
    if (!active?.Key) return false;
    if (!active.Key.startsWith(columnPrefix)) return false;
    const remainder = active.Key.substring(columnPrefix.length);
    return !remainder.includes('/');
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

  onMainScroll(event: Event) {
    if (this.isSyncingScroll) return;
    this.isSyncingScroll = true;
    const target = event.target as HTMLElement;
    if (this.manualScrollbar) {
      this.manualScrollbar.nativeElement.scrollLeft = target.scrollLeft;
    }
    requestAnimationFrame(() => (this.isSyncingScroll = false));
  }

  onManualScroll(event: Event) {
    if (this.isSyncingScroll) return;
    this.isSyncingScroll = true;
    const target = event.target as HTMLElement;
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollLeft = target.scrollLeft;
    }
    requestAnimationFrame(() => (this.isSyncingScroll = false));
  }

  private scrollToRightEdge() {
    if (this.scrollContainer) {
      const container = this.scrollContainer.nativeElement;

      setTimeout(() => {
        container.scrollTo({
          left: container.scrollWidth,
          behavior: 'smooth'
        });

        if (this.manualScrollbar) {
          this.manualScrollbar.nativeElement.scrollTo({
            left: container.scrollWidth,
            behavior: 'smooth'
          });
        }
      }, 50);
    }
  }
}
