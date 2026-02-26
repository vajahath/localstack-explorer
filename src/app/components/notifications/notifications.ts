import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Right side notifications -->
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-80 max-w-[90vw] pointer-events-none">
      @for (n of rightNotifications(); track n.id) {
        <div
          class="flex items-start gap-3 p-4 rounded-2xl border shadow-xl animate-slide-in-right backdrop-blur-md pointer-events-auto"
          [class]="getClasses(n.type)"
          role="alert"
        >
          <!-- Icon -->
          <div class="shrink-0 mt-0.5" [class]="getIconClasses(n.type)">
            @switch (n.type) {
              @case ('success') {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              }
              @case ('error') {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
              @case ('warning') {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              @default {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            @if (n.title) {
              <h4 class="text-sm font-bold truncate mb-0.5 leading-tight">{{ n.title }}</h4>
            }
            <p class="text-xs font-medium leading-relaxed break-words opacity-90">{{ n.message }}</p>
          </div>

          <!-- Close button -->
          <button
            (click)="notificationService.remove(n.id)"
            class="shrink-0 text-current opacity-40 hover:opacity-100 transition-opacity p-0.5 hover:bg-black/5 rounded-lg cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>

    <!-- Left side notifications -->
    <div class="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3 w-80 max-w-[90vw] pointer-events-none">
      @for (n of leftNotifications(); track n.id) {
        <div
          class="flex items-start gap-3 p-4 rounded-2xl border shadow-xl animate-slide-in-left backdrop-blur-md pointer-events-auto"
          [class]="getClasses(n.type)"
          role="alert"
        >
          <!-- Icon -->
          <div class="shrink-0 mt-0.5" [class]="getIconClasses(n.type)">
            @switch (n.type) {
              @case ('success') {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              }
              @case ('error') {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
              @case ('warning') {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              @default {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            @if (n.title) {
              <h4 class="text-sm font-bold truncate mb-0.5 leading-tight">{{ n.title }}</h4>
            }
            <p class="text-xs font-medium leading-relaxed break-words opacity-90">{{ n.message }}</p>
          </div>

          <!-- Close button -->
          <button
            (click)="notificationService.remove(n.id)"
            class="shrink-0 text-current opacity-40 hover:opacity-100 transition-opacity p-0.5 hover:bg-black/5 rounded-lg cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in-right {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in-right {
      animation: slide-in-right 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes slide-in-left {
      from { transform: translateX(-100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in-left {
      animation: slide-in-left 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
  `]
})
export class NotificationsComponent {
  protected notificationService = inject(NotificationService);

  rightNotifications = () => this.notificationService.notifications().filter(n => n.position === 'right' || !n.position);
  leftNotifications = () => this.notificationService.notifications().filter(n => n.position === 'left');

  getClasses(type: string) {
    switch (type) {
      case 'success':
        return 'bg-emerald-50/90 border-emerald-200 text-emerald-900 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300';
      case 'error':
        return 'bg-rose-50/90 border-rose-200 text-rose-900 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300';
      case 'warning':
        return 'bg-amber-50/90 border-amber-200 text-amber-900 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300';
      default:
        return 'bg-blue-50/90 border-blue-200 text-blue-900 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300';
    }
  }

  getIconClasses(type: string) {
    switch (type) {
      case 'success': return 'text-emerald-500';
      case 'error': return 'text-rose-500';
      case 'warning': return 'text-amber-500';
      default: return 'text-blue-500';
    }
  }
}
