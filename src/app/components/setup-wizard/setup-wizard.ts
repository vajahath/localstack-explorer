import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { S3Service } from '../../services/s3.service';
import { StateService } from '../../services/state.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-setup-wizard',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div
      class="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 font-sans transition-colors dark:bg-slate-950 dark:text-slate-100"
    >
      <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:bg-slate-900 dark:border-slate-800">
        <h2 class="text-2xl font-bold mb-2 text-center text-gray-800 dark:text-slate-100">LocalStack Explorer</h2>
        <p class="text-gray-500 mb-6 text-center text-sm dark:text-slate-400">
          Enter your LocalStack S3 endpoint to connect.
        </p>

        <form [formGroup]="form" (ngSubmit)="connect()">
          <div class="mb-4">
            <label for="endpoint" class="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300"
              >Endpoint URL</label
            >
            <input
              id="endpoint"
              type="url"
              formControlName="endpoint"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-600"
              placeholder="http://localhost:4566/"
            />
            @if (form.controls.endpoint.invalid && form.controls.endpoint.touched) {
              <p class="text-red-500 text-xs mt-1">Please enter a valid URL.</p>
            }
          </div>

          @if (errorMessage()) {
            <div class="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400">
              {{ errorMessage() }}
            </div>
          }

          <button
            type="submit"
            [disabled]="form.invalid || isLoading()"
            class="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center cursor-pointer active:scale-[0.99] shadow-lg shadow-blue-100 dark:shadow-none"
          >
            @if (isLoading()) {
              <svg
                class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
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
              Connecting...
            } @else {
              Connect to Explorer
            }
          </button>
        </form>
      </div>
    </div>
  `,
})
export class SetupWizardComponent {
  private fb = inject(NonNullableFormBuilder);
  private s3Service = inject(S3Service);
  private stateService = inject(StateService);
  private router = inject(Router);

  form = this.fb.group({
    endpoint: [
      'http://localhost:4566/',
      [Validators.required, Validators.pattern(/^https?:\/\/.+/)],
    ],
  });

  isLoading = signal(false);
  errorMessage = signal('');

  async connect() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    const endpoint = this.form.getRawValue().endpoint;

    try {
      this.s3Service.connect(endpoint);
      // Test the connection by trying to list buckets
      await this.s3Service.listBuckets();

      this.stateService.endpoint.set(endpoint);
      this.stateService.isConnected.set(true);
      // Navigate to explorer with encoded endpoint in URL
      this.router.navigate(['/explorer', { endpoint: btoa(endpoint) }]);
    } catch (error: any) {
      console.error('Connection failed:', error);
      this.errorMessage.set(error?.message || 'Failed to connect to LocalStack instance.');
      this.s3Service.disconnect();
    } finally {
      this.isLoading.set(false);
    }
  }
}
