import { TestBed } from '@angular/core/testing';
import { MillerColumnListComponent } from './miller-column-list';
import { S3Service, S3ListResult } from '../../services/s3.service';
import { signal } from '@angular/core';
import { CommonPrefix, _Object } from '@aws-sdk/client-s3';

describe('MillerColumnListComponent', () => {
    let s3ServiceSpy: {
        listObjects: ReturnType<typeof vi.fn>;
        endpoint: ReturnType<typeof signal<string | null>>;
    };

    const emptyResult: S3ListResult = { prefixes: [], objects: [] };

    function createFixture(bucket = 'test-bucket', prefix = '') {
        const fixture = TestBed.createComponent(MillerColumnListComponent);
        fixture.componentRef.setInput('bucket', bucket);
        fixture.componentRef.setInput('prefix', prefix);
        fixture.detectChanges(); // triggers the constructor effect → resetAndLoad()
        return fixture;
    }

    beforeEach(async () => {
        s3ServiceSpy = {
            listObjects: vi.fn().mockResolvedValue(emptyResult),
            endpoint: signal<string | null>(null),
        };

        await TestBed.configureTestingModule({
            imports: [MillerColumnListComponent],
            providers: [{ provide: S3Service, useValue: s3ServiceSpy }],
        }).compileComponents();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should create the component', () => {
        const fixture = createFixture();
        expect(fixture.componentInstance).toBeTruthy();
    });

    // ── Initial load ──────────────────────────────────────────────────────────
    describe('initial data load', () => {
        it('should call listObjects on initialisation', async () => {
            createFixture('my-bucket', 'prefix/');
            // Wait for async effect to settle
            await vi.waitFor(() => expect(s3ServiceSpy.listObjects).toHaveBeenCalled());
            expect(s3ServiceSpy.listObjects).toHaveBeenCalledWith('my-bucket', 'prefix/', undefined);
        });

        it('should populate prefixes and objects from the service result', async () => {
            const mockResult: S3ListResult = {
                prefixes: [{ Prefix: 'folder/' }],
                objects: [{ Key: 'file.txt' }],
            };
            s3ServiceSpy.listObjects.mockResolvedValue(mockResult);
            const fixture = createFixture();
            await vi.waitFor(() => expect(fixture.componentInstance.prefixes().length).toBe(1));
            expect(fixture.componentInstance.prefixes()).toEqual([{ Prefix: 'folder/' }]);
            expect(fixture.componentInstance.objects()).toEqual([{ Key: 'file.txt' }]);
        });

        it('should set isLoading to false after data is loaded', async () => {
            const fixture = createFixture();
            await vi.waitFor(() => expect(fixture.componentInstance.isLoading()).toBe(false));
        });
    });

    // ── Pagination ────────────────────────────────────────────────────────────
    describe('loadData() pagination', () => {
        it('should NOT call listObjects again when hasMore is false', async () => {
            // First call returns no token → hasMore becomes false
            s3ServiceSpy.listObjects.mockResolvedValue(emptyResult);
            const fixture = createFixture();
            await vi.waitFor(() => expect(s3ServiceSpy.listObjects).toHaveBeenCalledTimes(1));

            // Manual call should be a no-op
            await fixture.componentInstance.loadData();
            expect(s3ServiceSpy.listObjects).toHaveBeenCalledTimes(1);
        });

        it('should accumulate results across pages', async () => {
            const page1: S3ListResult = {
                prefixes: [{ Prefix: 'a/' }],
                objects: [{ Key: 'file1.txt' }],
                nextContinuationToken: 'token-1',
            };
            const page2: S3ListResult = {
                prefixes: [{ Prefix: 'b/' }],
                objects: [{ Key: 'file2.txt' }],
            };
            s3ServiceSpy.listObjects.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

            const fixture = createFixture();
            await vi.waitFor(() => expect(fixture.componentInstance.prefixes().length).toBe(1));

            // Trigger second page load
            await fixture.componentInstance.loadData();
            await vi.waitFor(() => expect(fixture.componentInstance.prefixes().length).toBe(2));

            expect(fixture.componentInstance.objects().length).toBe(2);
        });
    });

    // ── getFolderName() ───────────────────────────────────────────────────────
    describe('getFolderName()', () => {
        it('should return the last part of a nested trailing-slash prefix', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFolderName('top/nested/')).toBe('nested');
        });

        it('should return "/"for a single-slash prefix', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFolderName('/')).toBe('/');
        });

        it('should return the name for a top-level prefix', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFolderName('folder/')).toBe('folder');
        });
    });

    // ── getFileName() ─────────────────────────────────────────────────────────
    describe('getFileName()', () => {
        it('should return the filename from a nested key', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFileName('a/b/c/file.txt')).toBe('file.txt');
        });

        it('should return the key itself for a root-level key', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFileName('root-file.txt')).toBe('root-file.txt');
        });
    });

    // ── isSelectedFolder() ─────────────────────────────────────────────────────
    describe('isSelectedFolder()', () => {
        it('should return true when the folder prefix matches activeNextPrefix input', () => {
            const fixture = TestBed.createComponent(MillerColumnListComponent);
            fixture.componentRef.setInput('bucket', 'b');
            fixture.componentRef.setInput('activeNextPrefix', 'folder/');
            fixture.detectChanges();
            expect(fixture.componentInstance.isSelectedFolder('folder/')).toBe(true);
        });

        it('should return false when the folder prefix does NOT match', () => {
            const fixture = TestBed.createComponent(MillerColumnListComponent);
            fixture.componentRef.setInput('bucket', 'b');
            fixture.componentRef.setInput('activeNextPrefix', 'other/');
            fixture.detectChanges();
            expect(fixture.componentInstance.isSelectedFolder('folder/')).toBe(false);
        });

        it('should return false when activeNextPrefix is null', () => {
            const fixture = TestBed.createComponent(MillerColumnListComponent);
            fixture.componentRef.setInput('bucket', 'b');
            fixture.componentRef.setInput('activeNextPrefix', null);
            fixture.detectChanges();
            expect(fixture.componentInstance.isSelectedFolder('folder/')).toBe(false);
        });
    });

    // ── onFolderClick() & onFileClick() ──────────────────────────────────────
    describe('event emitters', () => {
        it('should emit folderSelected with the prefix when a folder is clicked', () => {
            const fixture = createFixture();
            const emittedValues: string[] = [];
            fixture.componentInstance.folderSelected.subscribe((v) => emittedValues.push(v));

            const folder: CommonPrefix = { Prefix: 'folder/' };
            fixture.componentInstance.onFolderClick(folder);

            expect(emittedValues).toEqual(['folder/']);
        });

        it('should NOT emit folderSelected when folder has no Prefix', () => {
            const fixture = createFixture();
            const emittedValues: string[] = [];
            fixture.componentInstance.folderSelected.subscribe((v) => emittedValues.push(v));

            fixture.componentInstance.onFolderClick({});

            expect(emittedValues).toEqual([]);
        });

        it('should emit fileSelected with the _Object when a file is clicked', () => {
            const fixture = createFixture();
            const emittedValues: _Object[] = [];
            fixture.componentInstance.fileSelected.subscribe((v) => emittedValues.push(v));

            const file: _Object = { Key: 'file.txt', Size: 1024 };
            fixture.componentInstance.onFileClick(file);

            expect(emittedValues).toEqual([file]);
        });
    });

    // ── onScroll() ────────────────────────────────────────────────────────────
    describe('onScroll()', () => {
        it('should call loadData() when scrolled near the bottom', async () => {
            // Set up a token so hasMore is true for the second page
            const page1: S3ListResult = {
                prefixes: [{ Prefix: 'f/' }],
                objects: [],
                nextContinuationToken: 'tok',
            };
            s3ServiceSpy.listObjects.mockResolvedValue(page1);

            const fixture = createFixture();
            await vi.waitFor(() => expect(s3ServiceSpy.listObjects).toHaveBeenCalledTimes(1));

            s3ServiceSpy.listObjects.mockResolvedValue(emptyResult);

            // Simulate a scroll event where the container is near the bottom
            const mockEvent = {
                target: { scrollHeight: 500, scrollTop: 450, clientHeight: 60 },
            } as unknown as Event;

            fixture.componentInstance.onScroll(mockEvent);
            await vi.waitFor(() => expect(s3ServiceSpy.listObjects).toHaveBeenCalledTimes(2));
        });

        it('should NOT call loadData() when not near the bottom', async () => {
            s3ServiceSpy.listObjects.mockResolvedValue({
                ...emptyResult,
                nextContinuationToken: 'tok',
            });
            const fixture = createFixture();
            await vi.waitFor(() => expect(s3ServiceSpy.listObjects).toHaveBeenCalledTimes(1));

            const mockEvent = {
                target: { scrollHeight: 500, scrollTop: 0, clientHeight: 60 },
            } as unknown as Event;
            fixture.componentInstance.onScroll(mockEvent);
            // Should still be just 1 call
            expect(s3ServiceSpy.listObjects).toHaveBeenCalledTimes(1);
        });
    });
});
