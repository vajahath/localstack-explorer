import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

@Component({
  selector: 'app-update-notifier',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loaded()) {
      @if (error()) {
        <!-- don't show anything on error -->
      } @else {
        @if (updateAvailable()) {
          <a
            class="group relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-100 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white border-transparent cursor-pointer"
            href="https://www.npmjs.com/package/localstack-explorer"
            target="_blank"
            rel="noopener noreferrer"
            title="Update available — click to view on npm"
          >
            <span class="text-base">✨</span>
            <span class="tracking-wide">Update available!</span>
            <span class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-sm font-mono text-[10px]">
              <span>{{ currentVersion() }}</span>
              <span class="text-base">→</span>
              <span class="font-extrabold">{{ latestVersion() }}</span>
            </span>
            <span class="text-base">🎉</span>
          </a>
        }
      }
    }
  `,
  styles: ``,
})
export class UpdateNotifier {
  loaded = signal(false);
  error = signal(false);
  currentVersion = signal('');
  latestVersion = signal('');
  updateAvailable = signal(false);

  constructor() {
    void this.check();
  }

  async check() {
    try {
      const res = await fetch('/_api/check-updates', { cache: 'no-store' });
      if (!res.ok) throw new Error('non-ok');
      const data = await res.json();
      this.currentVersion.set(data.currentVersion ?? '');
      this.latestVersion.set(data.latestVersion ?? '');
      this.updateAvailable.set(Boolean(data.updateAvailable));
    } catch (e) {
      this.error.set(true);
    } finally {
      this.loaded.set(true);
    }
  }
}
