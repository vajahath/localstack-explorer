import { Component, ChangeDetectionStrategy, inject, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { S3Service } from '../../services/s3.service';
import { NotificationService } from '../../services/notification.service';

@Component({
    selector: 'app-object-metadata-editor',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="space-y-3 mt-8">
      <div class="flex items-center justify-between px-1">
        <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] dark:text-slate-500">Custom Metadata</h4>
        <button (click)="addMetadata()" type="button" class="text-blue-500 hover:text-blue-600 dark:text-blue-400 text-[11px] font-bold py-1 px-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors inline-flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Add
        </button>
      </div>
      
      <div class="bg-gray-50/50 border border-gray-100 rounded-xl overflow-hidden shadow-sm dark:bg-slate-900/40 dark:border-slate-800">
        @if (isLoading()) {
          <div class="p-6 flex justify-center">
            <svg class="animate-spin h-5 w-5 text-blue-500 opacity-50" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="saveMetadata()">
            @if (metadataControls().length === 0) {
              <div class="px-4 py-8 text-[12px] text-gray-400 dark:text-slate-500 text-center border-b border-transparent">
                No custom metadata attached
              </div>
            } @else {
              <div class="flex flex-col divide-y divide-gray-100 dark:divide-slate-800" formArrayName="metadata">
                @for (entry of metadataControls(); track $index) {
                  <div [formGroupName]="$index" class="flex items-center gap-2 px-3 py-2.5 hover:bg-white transition-colors dark:hover:bg-slate-800/40 group">
                    <input 
                      formControlName="key"
                      placeholder="Key"
                      class="w-1/3 min-w-0 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1.5 text-[12px] text-gray-700 dark:text-slate-300 dark:hover:border-slate-700 focus:outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-slate-600 font-mono"
                      [class.border-red-500]="entry.get('key')?.invalid && entry.get('key')?.touched"
                    />
                    <span class="text-gray-300 dark:text-slate-600 font-medium">:</span>
                    <input 
                      formControlName="value"
                      placeholder="Value"
                      class="flex-1 min-w-0 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1.5 text-[12px] text-gray-900 dark:text-slate-200 dark:hover:border-slate-700 focus:outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-slate-600"
                    />
                    <button 
                      type="button"
                      (click)="removeMetadata($index)"
                      class="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:text-slate-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Remove"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                }
              </div>
            }
            
            <!-- Save Controls -->
            @if (form.dirty) {
              <div class="px-3 py-3 bg-blue-50/50 border-t border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30 flex justify-end gap-2 items-center">
                 @if (form.invalid) {
                   <span class="text-[11px] text-red-500 mr-auto px-2 font-medium">Keys must be unique and non-empty</span>
                 }
                 <button type="button" (click)="resetMetadata()" [disabled]="isSaving()" class="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-700 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-all active:scale-[0.97] disabled:opacity-50">
                   Cancel
                 </button>
                 <button 
                   type="submit" 
                   [disabled]="isSaving() || form.invalid" 
                   class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-md shadow-sm transition-all active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 flex items-center gap-1.5"
                 >
                    @if (isSaving()) {
                       <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       Saving...
                    } @else {
                       Save
                    }
                 </button>
              </div>
            }
          </form>
        }
      </div>
    </div>
  `
})
export class ObjectMetadataEditorComponent {
    bucketName = input.required<string>();
    objectKey = input.required<string>();

    // Emits when save is successful so parent can refetch object properties
    metadataUpdated = output<void>();

    private s3Service = inject(S3Service);
    private fb = inject(FormBuilder);
    private notificationService = inject(NotificationService);

    isLoading = signal(false);
    isSaving = signal(false);

    originalMetadata: Record<string, string> = {};

    form = this.fb.group({
        metadata: this.fb.array([], [this.uniqueKeysValidator])
    });

    constructor() {
        effect(() => {
            // Re-fetch metadata whenever bucket or key changes
            const bucket = this.bucketName();
            const key = this.objectKey();
            if (bucket && key) {
                this.fetchMetadata(bucket, key);
            }
        });
    }

    get metadataFormArray(): FormArray {
        return this.form.get('metadata') as FormArray;
    }

    metadataControls(): AbstractControl[] {
        return this.metadataFormArray.controls;
    }

    uniqueKeysValidator(control: AbstractControl): ValidationErrors | null {
        if (!(control instanceof FormArray)) return null;
        const keys = new Set<string>();
        for (const group of control.controls) {
            const keyVal = group.get('key')?.value?.trim();
            if (!keyVal) continue; // let required validator handle empty
            if (keys.has(keyVal)) return { duplicateKeys: true };
            keys.add(keyVal);
        }
        return null;
    }

    async fetchMetadata(bucket: string, key: string) {
        this.isLoading.set(true);
        try {
            const meta = await this.s3Service.getObjectMetadata(bucket, key);
            this.originalMetadata = meta || {};
            this.resetMetadata();
        } catch (err) {
            console.error('Failed to fetch metadata', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    resetMetadata() {
        this.metadataFormArray.clear();
        Object.entries(this.originalMetadata).forEach(([key, value]) => {
            this.metadataFormArray.push(this.fb.group({
                key: [key, Validators.required],
                value: [value]
            }));
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    addMetadata() {
        this.metadataFormArray.push(this.fb.group({
            key: ['', Validators.required],
            value: ['']
        }));
        this.form.markAsDirty();
    }

    removeMetadata(index: number) {
        this.metadataFormArray.removeAt(index);
        this.form.markAsDirty();
    }

    async saveMetadata() {
        if (this.form.invalid) return;

        const bucket = this.bucketName();
        const key = this.objectKey();

        const newMeta: Record<string, string> = {};
        for (const control of this.metadataFormArray.controls) {
            const k = control.get('key')?.value?.trim();
            const v = control.get('value')?.value;
            if (k) {
                newMeta[k] = v;
            }
        }

        this.isSaving.set(true);
        try {
            // Intentionally omitting user toast success here as requested
            await this.s3Service.updateObjectMetadataSilent(bucket, key, newMeta);
            this.originalMetadata = newMeta;
            this.resetMetadata();
            this.metadataUpdated.emit();
        } catch (err: any) {
            console.error('Error saving metadata', err);
            // Show error toast on bottom left
            this.notificationService.show(err.message || 'Failed to update metadata', 'error', 'Metadata');
        } finally {
            this.isSaving.set(false);
        }
    }
}
