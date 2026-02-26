import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

/**
 * We mock `window.matchMedia` so tests are not dependent on the
 * actual system preference and so we can control it.
 */
function mockMatchMedia(matches: boolean) {
    const listeners: ((e: MediaQueryListEvent) => void)[] = [];

    const mediaQueryList: Partial<MediaQueryList> = {
        matches,
        addEventListener: (_event: string, handler: EventListenerOrEventListenerObject) => {
            listeners.push(handler as (e: MediaQueryListEvent) => void);
        },
        removeEventListener: () => { },
    };

    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockReturnValue(mediaQueryList),
    });

    return { listeners };
}

describe('ThemeService', () => {
    afterEach(() => {
        // Clean up DOM class after each test
        document.documentElement.classList.remove('dark');
    });

    describe('when system prefers light mode', () => {
        beforeEach(() => {
            mockMatchMedia(false);
            TestBed.configureTestingModule({});
        });

        it('should be created', () => {
            const service = TestBed.inject(ThemeService);
            expect(service).toBeTruthy();
        });

        it('should initialize isDark signal to false', () => {
            const service = TestBed.inject(ThemeService);
            expect(service.isDark()).toBe(false);
        });

        it('should NOT add "dark" class to documentElement on init', () => {
            TestBed.inject(ThemeService);
            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });
    });

    describe('when system prefers dark mode', () => {
        beforeEach(() => {
            mockMatchMedia(true);
            TestBed.configureTestingModule({});
        });

        it('should initialize isDark signal to true', () => {
            const service = TestBed.inject(ThemeService);
            expect(service.isDark()).toBe(true);
        });

        it('should add "dark" class to documentElement on init', () => {
            TestBed.inject(ThemeService);
            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });
    });

    describe('when system theme changes at runtime', () => {
        it('should update isDark signal and toggle "dark" class to dark', () => {
            const { listeners } = mockMatchMedia(false);
            TestBed.configureTestingModule({});
            const service = TestBed.inject(ThemeService);

            expect(service.isDark()).toBe(false);
            expect(document.documentElement.classList.contains('dark')).toBe(false);

            // Simulate OS-level dark mode change
            listeners[0]({ matches: true } as MediaQueryListEvent);

            expect(service.isDark()).toBe(true);
            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });

        it('should update isDark signal and toggle "dark" class to light', () => {
            const { listeners } = mockMatchMedia(true);
            TestBed.configureTestingModule({});
            const service = TestBed.inject(ThemeService);

            expect(service.isDark()).toBe(true);
            expect(document.documentElement.classList.contains('dark')).toBe(true);

            listeners[0]({ matches: false } as MediaQueryListEvent);

            expect(service.isDark()).toBe(false);
            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });
    });
});
