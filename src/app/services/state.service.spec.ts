import { TestBed } from '@angular/core/testing';
import { StateService } from './state.service';
import { Router } from '@angular/router';

describe('StateService', () => {
    let service: StateService;
    let routerSpy: { navigate: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        routerSpy = { navigate: vi.fn() };

        TestBed.configureTestingModule({
            providers: [StateService, { provide: Router, useValue: routerSpy }],
        });

        service = TestBed.inject(StateService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    // ── Initial State ──────────────────────────────────────────────────────────
    describe('initial state', () => {
        it('should start not connected', () => {
            expect(service.isConnected()).toBe(false);
        });

        it('should start with null endpoint', () => {
            expect(service.endpoint()).toBeNull();
        });

        it('should start with null selectedBucket', () => {
            expect(service.selectedBucket()).toBeNull();
        });

        it('should start with an empty selectedPathParts', () => {
            expect(service.selectedPathParts()).toEqual([]);
        });

        it('should start with null activeObject', () => {
            expect(service.activeObject()).toBeNull();
        });

        it('should have an empty currentPrefix initially', () => {
            expect(service.currentPrefix()).toBe('');
        });
    });

    // ── currentPrefix computed ─────────────────────────────────────────────────
    describe('currentPrefix computed', () => {
        it('should be empty when no parts are set', () => {
            service.selectedPathParts.set([]);
            expect(service.currentPrefix()).toBe('');
        });

        it('should compute a single part prefix correctly', () => {
            service.selectedPathParts.set(['folder']);
            expect(service.currentPrefix()).toBe('folder/');
        });

        it('should compute a nested prefix correctly', () => {
            service.selectedPathParts.set(['a', 'b', 'c']);
            expect(service.currentPrefix()).toBe('a/b/c/');
        });
    });

    // ── navigateBucket() ──────────────────────────────────────────────────────
    describe('navigateBucket()', () => {
        it('should set the selectedBucket', () => {
            service.navigateBucket('my-bucket');
            expect(service.selectedBucket()).toBe('my-bucket');
        });

        it('should reset selectedPathParts to empty', () => {
            service.selectedPathParts.set(['folder1', 'folder2']);
            service.navigateBucket('my-bucket');
            expect(service.selectedPathParts()).toEqual([]);
        });

        it('should reset activeObject to null', () => {
            service.activeObject.set({ Key: 'file.txt' });
            service.navigateBucket('my-bucket');
            expect(service.activeObject()).toBeNull();
        });

        it('should replace the selectedBucket when called multiple times', () => {
            service.navigateBucket('bucket-one');
            service.navigateBucket('bucket-two');
            expect(service.selectedBucket()).toBe('bucket-two');
        });
    });

    // ── navigatePath() ────────────────────────────────────────────────────────
    describe('navigatePath()', () => {
        it('should update selectedPathParts', () => {
            service.navigatePath(['a', 'b']);
            expect(service.selectedPathParts()).toEqual(['a', 'b']);
        });

        it('should allow navigating to an empty path (root)', () => {
            service.selectedPathParts.set(['a', 'b']);
            service.navigatePath([]);
            expect(service.selectedPathParts()).toEqual([]);
        });

        it('should replace existing path parts', () => {
            service.navigatePath(['x', 'y']);
            service.navigatePath(['a', 'b', 'c']);
            expect(service.selectedPathParts()).toEqual(['a', 'b', 'c']);
        });
    });

    // ── syncFromUrl() ─────────────────────────────────────────────────────────
    describe('syncFromUrl()', () => {
        it('should decode a base64 endpoint and set it', () => {
            const encoded = btoa('http://localhost:4566/');
            service.syncFromUrl(null, null, encoded);
            expect(service.endpoint()).toBe('http://localhost:4566/');
        });

        it('should set endpoint to null when no endpoint is provided', () => {
            service.endpoint.set('http://localhost:4566/');
            service.syncFromUrl(null, null, null);
            expect(service.endpoint()).toBeNull();
        });

        it('should set the selectedBucket from URL', () => {
            service.syncFromUrl('my-bucket', null, null);
            expect(service.selectedBucket()).toBe('my-bucket');
        });

        it('should set selectedBucket to null when not in URL', () => {
            service.selectedBucket.set('old-bucket');
            service.syncFromUrl(null, null, null);
            expect(service.selectedBucket()).toBeNull();
        });

        it('should parse a prefix string into selectedPathParts', () => {
            service.syncFromUrl(null, 'folder1/folder2/', null);
            expect(service.selectedPathParts()).toEqual(['folder1', 'folder2']);
        });

        it('should clear path parts with a null prefix', () => {
            service.selectedPathParts.set(['a', 'b']);
            service.syncFromUrl(null, null, null);
            expect(service.selectedPathParts()).toEqual([]);
        });

        it('should not update endpoint signal if it has not changed', () => {
            const encoded = btoa('http://localhost:4566/');
            service.syncFromUrl(null, null, encoded);
            const signalSetSpy = vi.spyOn(service.endpoint, 'set');
            // Call again with the same value - should not call set()
            service.syncFromUrl(null, null, encoded);
            expect(signalSetSpy).not.toHaveBeenCalled();
        });

        it('should not update selectedBucket if it has not changed', () => {
            service.syncFromUrl('my-bucket', null, null);
            const signalSetSpy = vi.spyOn(service.selectedBucket, 'set');
            service.syncFromUrl('my-bucket', null, null);
            expect(signalSetSpy).not.toHaveBeenCalled();
        });

        it('should not update selectedPathParts if they have not changed', () => {
            service.syncFromUrl(null, 'a/b/', null);
            const signalSetSpy = vi.spyOn(service.selectedPathParts, 'set');
            service.syncFromUrl(null, 'a/b/', null);
            expect(signalSetSpy).not.toHaveBeenCalled();
        });

        it('should handle gracefully an invalid base64 endpoint string', () => {
            // Should not throw and leave the endpoint unchanged
            expect(() => service.syncFromUrl(null, null, 'not-valid-base64!!!')).not.toThrow();
        });
    });

    // ── URL sync effect ───────────────────────────────────────────────────────
    describe('URL sync effect', () => {
        it('should navigate to /explorer with encoded params when connected', () => {
            TestBed.flushEffects();
            routerSpy.navigate.mockClear();

            service.isConnected.set(true);
            service.endpoint.set('http://localhost:4566/');
            service.selectedBucket.set('my-bucket');
            service.selectedPathParts.set(['folder']);

            TestBed.flushEffects();

            expect(routerSpy.navigate).toHaveBeenCalledWith(
                [
                    '/explorer',
                    expect.objectContaining({
                        endpoint: btoa('http://localhost:4566/'),
                        bucket: 'my-bucket',
                        prefix: 'folder/',
                    }),
                ],
                expect.objectContaining({ replaceUrl: true }),
            );
        });

        it('should NOT navigate when not connected', () => {
            TestBed.flushEffects();
            routerSpy.navigate.mockClear();

            service.isConnected.set(false);
            service.endpoint.set('http://localhost:4566/');
            TestBed.flushEffects();

            expect(routerSpy.navigate).not.toHaveBeenCalled();
        });

        it('should navigate without prefix param when path parts are empty', () => {
            service.isConnected.set(true);
            service.endpoint.set('http://localhost:4566/');
            service.selectedBucket.set('bucket');
            service.selectedPathParts.set([]);
            TestBed.flushEffects();

            const callArgs = routerSpy.navigate.mock.calls.at(-1)?.[0]?.[1];
            expect(callArgs).not.toHaveProperty('prefix');
        });
    });
});
