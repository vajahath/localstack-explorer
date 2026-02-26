import { TestBed } from '@angular/core/testing';
import { MillerColumnsComponent } from './miller-columns';
import { StateService } from '../../services/state.service';
import { MillerColumnListComponent } from '../miller-column-list/miller-column-list';
import { signal, Component, input, output, NO_ERRORS_SCHEMA } from '@angular/core';
import { _Object } from '@aws-sdk/client-s3';
import { CommonPrefix } from '@aws-sdk/client-s3';

/** Minimal stub so we don't need real S3 calls */
@Component({
    selector: 'app-miller-column-list',
    template: '',
    standalone: true,
})
class MockMillerColumnListComponent {
    bucket = input.required<string>();
    prefix = input<string>('');
    title = input<string>();
    activeNextPrefix = input<string | null>(null);
    activeObject = input<_Object | null>(null);
    isLastColumn = input<boolean>(false);
    folderSelected = output<string>();
    fileSelected = output<_Object>();
}

// jsdom doesn't implement ResizeObserver/MutationObserver; stub them as classes
class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

class MockMutationObserver {
    observe = vi.fn();
    disconnect = vi.fn();
}

describe('MillerColumnsComponent', () => {
    let stateServiceSpy: {
        selectedPathParts: ReturnType<typeof signal<string[]>>;
        activeObject: ReturnType<typeof signal<_Object | null>>;
        navigatePath: ReturnType<typeof vi.fn>;
    };

    beforeAll(() => {
        vi.stubGlobal('ResizeObserver', MockResizeObserver);
        vi.stubGlobal('MutationObserver', MockMutationObserver);
    });

    afterAll(() => {
        vi.unstubAllGlobals();
    });

    function createFixture() {
        const fixture = TestBed.createComponent(MillerColumnsComponent);
        fixture.componentRef.setInput('bucket', 'test-bucket');
        fixture.detectChanges();
        return fixture;
    }

    beforeEach(async () => {
        stateServiceSpy = {
            selectedPathParts: signal<string[]>([]),
            activeObject: signal<_Object | null>(null),
            navigatePath: vi.fn(),
        };

        await TestBed.configureTestingModule({
            imports: [MillerColumnsComponent],
            providers: [{ provide: StateService, useValue: stateServiceSpy }],
            schemas: [NO_ERRORS_SCHEMA],
        })
            .overrideComponent(MillerColumnsComponent, {
                remove: { imports: [MillerColumnListComponent] },
                add: { imports: [MockMillerColumnListComponent] },
            })
            .compileComponents();
    });

    it('should create the component', () => {
        const fixture = createFixture();
        expect(fixture.componentInstance).toBeTruthy();
    });

    // ── columns computed ──────────────────────────────────────────────────────
    describe('columns computed', () => {
        it('should return an empty array when no path parts are set', () => {
            const fixture = createFixture();
            stateServiceSpy.selectedPathParts.set([]);
            expect(fixture.componentInstance.columns()).toEqual([]);
        });

        it('should compute column prefixes from selectedPathParts', () => {
            const fixture = createFixture();
            stateServiceSpy.selectedPathParts.set(['folder1', 'folder2']);
            expect(fixture.componentInstance.columns()).toEqual(['folder1/', 'folder1/folder2/']);
        });

        it('should compute a single column for a single part', () => {
            const fixture = createFixture();
            stateServiceSpy.selectedPathParts.set(['folder']);
            expect(fixture.componentInstance.columns()).toEqual(['folder/']);
        });
    });

    // ── getFolderName() ───────────────────────────────────────────────────────
    describe('getFolderName()', () => {
        it('should return the last folder name from a trailing-slash prefix', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFolderName('folder1/folder2/')).toBe('folder2');
        });

        it('should return "/" for a root-like prefix', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFolderName('/')).toBe('/');
        });

        it('should return the name for a top-level prefix', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFolderName('top-level/')).toBe('top-level');
        });
    });

    // ── getFileName() ─────────────────────────────────────────────────────────
    describe('getFileName()', () => {
        it('should return the filename from a full S3 key', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFileName('folder/sub/file.txt')).toBe('file.txt');
        });

        it('should return the key itself if there is no slash', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFileName('file.txt')).toBe('file.txt');
        });

        it('should return an empty string for a trailing-slash key', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFileName('folder/')).toBe('');
        });
    });

    // ── isRootObjectActive() ──────────────────────────────────────────────────
    describe('isRootObjectActive()', () => {
        it('should return true for a root-level object (no slash in key)', () => {
            const fixture = createFixture();
            stateServiceSpy.activeObject.set({ Key: 'root-file.txt' });
            expect(fixture.componentInstance.isRootObjectActive()).toBe(true);
        });

        it('should return false for a nested object', () => {
            const fixture = createFixture();
            stateServiceSpy.activeObject.set({ Key: 'folder/file.txt' });
            expect(fixture.componentInstance.isRootObjectActive()).toBe(false);
        });

        it('should return false when activeObject is null', () => {
            const fixture = createFixture();
            stateServiceSpy.activeObject.set(null);
            expect(fixture.componentInstance.isRootObjectActive()).toBe(false);
        });
    });

    // ── isObjectActiveInColumn() ──────────────────────────────────────────────
    describe('isObjectActiveInColumn()', () => {
        it('should return true when object is directly inside the column prefix', () => {
            const fixture = createFixture();
            stateServiceSpy.activeObject.set({ Key: 'folder/file.txt' });
            expect(fixture.componentInstance.isObjectActiveInColumn('folder/')).toBe(true);
        });

        it('should return false when object is nested deeper', () => {
            const fixture = createFixture();
            stateServiceSpy.activeObject.set({ Key: 'folder/sub/file.txt' });
            expect(fixture.componentInstance.isObjectActiveInColumn('folder/')).toBe(false);
        });

        it('should return false when key does not start with the column prefix', () => {
            const fixture = createFixture();
            stateServiceSpy.activeObject.set({ Key: 'other/file.txt' });
            expect(fixture.componentInstance.isObjectActiveInColumn('folder/')).toBe(false);
        });

        it('should return false when activeObject is null', () => {
            const fixture = createFixture();
            stateServiceSpy.activeObject.set(null);
            expect(fixture.componentInstance.isObjectActiveInColumn('folder/')).toBe(false);
        });
    });

    // ── onPrefixSelected() ────────────────────────────────────────────────────
    describe('onPrefixSelected()', () => {
        it('should call stateService.navigatePath with parsed parts', () => {
            const fixture = createFixture();
            fixture.componentInstance.onPrefixSelected('folder1/folder2/', 0);
            expect(stateServiceSpy.navigatePath).toHaveBeenCalledWith(['folder1', 'folder2']);
        });

        it('should clear activeObject when a new prefix is selected', () => {
            const fixture = createFixture();
            stateServiceSpy.activeObject.set({ Key: 'folder1/file.txt' });
            fixture.componentInstance.onPrefixSelected('folder1/', 0);
            expect(stateServiceSpy.activeObject()).toBeNull();
        });
    });

    // ── navigateToDepth() ─────────────────────────────────────────────────────
    describe('navigateToDepth()', () => {
        it('should navigate to the selected depth', () => {
            const fixture = createFixture();
            stateServiceSpy.selectedPathParts.set(['a', 'b', 'c']);
            fixture.componentInstance.navigateToDepth(1);
            expect(stateServiceSpy.navigatePath).toHaveBeenCalledWith(['a', 'b']);
        });

        it('should clear all path parts when depth is -1 (root click)', () => {
            const fixture = createFixture();
            stateServiceSpy.selectedPathParts.set(['a', 'b']);
            fixture.componentInstance.navigateToDepth(-1);
            expect(stateServiceSpy.navigatePath).toHaveBeenCalledWith([]);
        });
    });
});
