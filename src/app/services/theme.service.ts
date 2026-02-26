import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    // Whether the system/app is currently in dark mode
    isDark = signal<boolean>(window.matchMedia('(prefers-color-scheme: dark)').matches);

    constructor() {
        this.init();
    }

    private init() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // Initial sync
        this.applyTheme(this.isDark());

        // Listen for future system theme changes
        mediaQuery.addEventListener('change', (e) => {
            this.isDark.set(e.matches);
            this.applyTheme(e.matches);
        });
    }

    private applyTheme(dark: boolean) {
        const root = document.documentElement;
        if (dark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }
}
