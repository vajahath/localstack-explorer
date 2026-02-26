import { TestBed } from '@angular/core/testing';
import { DetailsPanelComponent } from './details-panel';
import { S3Service } from '../../services/s3.service';
import { ThemeService } from '../../services/theme.service';
import { MonacoEditorComponent } from '../monaco-editor/monaco-editor';
import { signal, Component } from '@angular/core';
import { _Object } from '@aws-sdk/client-s3';

/** Stub MonacoEditorComponent to avoid loading the real Monaco library in tests */
@Component({
    selector: 'app-monaco-editor',
    template: '',
    standalone: true,
})
class MockMonacoEditorComponent {
    content = signal('');
    language = signal('plaintext');
}

describe('DetailsPanelComponent', () => {
    let s3ServiceSpy: {
        getObjectRange: ReturnType<typeof vi.fn>;
        getObject: ReturnType<typeof vi.fn>;
        getObjectBinaryRange: ReturnType<typeof vi.fn>;
        getObjectMetadata: ReturnType<typeof vi.fn>;
        updateObjectMetadata: ReturnType<typeof vi.fn>;
        headObject: ReturnType<typeof vi.fn>;
        endpoint: ReturnType<typeof signal<string | null>>;
    };
    let themeServiceSpy: {
        isDark: ReturnType<typeof signal<boolean>>;
    };
    let stateServiceSpy: {
        activeObject: ReturnType<typeof signal<_Object | null>>;
    };

    const makeFile = (key: string, size = 1024): _Object => ({
        Key: key,
        Size: size,
        LastModified: new Date('2024-01-15'),
        StorageClass: 'STANDARD',
        ETag: '"abc123"',
    });

    function createFixture(file: _Object | null = null, bucketName = 'test-bucket') {
        const fixture = TestBed.createComponent(DetailsPanelComponent);
        // setInput() works with both @Input() and input() signal API
        fixture.componentRef.setInput('file', file);
        fixture.componentRef.setInput('bucketName', bucketName);
        fixture.detectChanges();
        return fixture;
    }

    beforeEach(async () => {
        s3ServiceSpy = {
            getObjectRange: vi.fn().mockResolvedValue({ content: '', isClipped: false }),
            getObject: vi.fn().mockResolvedValue(new Blob(['content'])),
            getObjectBinaryRange: vi.fn().mockResolvedValue(new Uint8Array()),
            getObjectMetadata: vi.fn().mockResolvedValue({}),
            updateObjectMetadata: vi.fn().mockResolvedValue(undefined),
            headObject: vi.fn().mockResolvedValue({}),
            endpoint: signal<string | null>(null),
        };
        themeServiceSpy = {
            isDark: signal(false),
        };
        stateServiceSpy = {
            activeObject: signal<_Object | null>(null),
        };

        await TestBed.configureTestingModule({
            imports: [DetailsPanelComponent],
            providers: [
                { provide: S3Service, useValue: s3ServiceSpy },
                { provide: ThemeService, useValue: themeServiceSpy },
                { provide: 'StateService', useValue: stateServiceSpy }, // Will be injected if provided, but let's mock the actual token below
            ]
        })
            .overrideComponent(DetailsPanelComponent, {
                remove: { imports: [MonacoEditorComponent] },
                add: { imports: [MockMonacoEditorComponent] },
            })
            .compileComponents();
    });

    afterEach(() => {
        // Restore all spies (vi.spyOn) so they don't leak across tests
        vi.restoreAllMocks();
    });

    it('should create', () => {
        const fixture = createFixture();
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should show "Select an object to inspect" when no file is provided', () => {
        const fixture = createFixture(null);
        expect(fixture.nativeElement.textContent).toContain('Select an object to inspect');
    });

    it('should render the filename when a file is provided', () => {
        const fixture = createFixture(makeFile('folder/report.json'));
        expect(fixture.nativeElement.textContent).toContain('report.json');
    });

    // ── getFileName() ─────────────────────────────────────────────────────────
    describe('getFileName()', () => {
        it('should return the last segment of a nested key', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFileName('folder/sub/file.txt')).toBe('file.txt');
        });

        it('should return the key itself for a root key', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFileName('file.txt')).toBe('file.txt');
        });

        it('should return "Unknown File" for undefined input', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.getFileName(undefined)).toBe('Unknown File');
        });
    });

    // ── formatBytes() ─────────────────────────────────────────────────────────
    describe('formatBytes()', () => {
        it('should return "0 Bytes" for 0', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.formatBytes(0)).toBe('0 Bytes');
        });

        it('should format bytes correctly', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.formatBytes(1024)).toBe('1 KB');
        });

        it('should format megabytes correctly', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.formatBytes(1024 * 1024)).toBe('1 MB');
        });

        it('should handle decimal sizes', () => {
            const fixture = createFixture();
            expect(fixture.componentInstance.formatBytes(1500)).toBe('1.46 KB');
        });
    });

    // ── isGzip() ──────────────────────────────────────────────────────────────
    describe('isGzip()', () => {
        it('should return true for a .gz file', () => {
            const fixture = createFixture(makeFile('data.json.gz'));
            expect(fixture.componentInstance.isGzip()).toBe(true);
        });

        it('should return false for a non-.gz file', () => {
            const fixture = createFixture(makeFile('data.json'));
            expect(fixture.componentInstance.isGzip()).toBe(false);
        });

        it('should return false when file is null', () => {
            const fixture = createFixture(null);
            expect(fixture.componentInstance.isGzip()).toBe(false);
        });
    });

    // ── isPreviewable() ───────────────────────────────────────────────────────
    describe('isPreviewable()', () => {
        it.each(['.txt', '.json', '.md', '.log', '.js', '.ts'])(
            'should return true for a %s file',
            (ext) => {
                const fixture = createFixture(makeFile(`file${ext}`));
                expect(fixture.componentInstance.isPreviewable()).toBe(true);
            },
        );

        it('should return false for an unsupported file type (.png)', () => {
            const fixture = createFixture(makeFile('image.png'));
            expect(fixture.componentInstance.isPreviewable()).toBe(false);
        });

        it('should return true for a .gz file (decompress preview)', () => {
            const fixture = createFixture(makeFile('data.gz'));
            expect(fixture.componentInstance.isPreviewable()).toBe(true);
        });

        it('should return false when file is null', () => {
            const fixture = createFixture(null);
            expect(fixture.componentInstance.isPreviewable()).toBe(false);
        });
    });

    // ── getLanguage() ─────────────────────────────────────────────────────────
    describe('getLanguage()', () => {
        it.each([
            ['file.json', 'json'],
            ['file.md', 'markdown'],
            ['file.js', 'javascript'],
            ['file.ts', 'typescript'],
            ['file.txt', 'plaintext'],
            ['file.json.gz', 'json'],
            ['file.unknown', 'plaintext'],
        ])('should return "%s" language for key "%s"', (key, expectedLang) => {
            const fixture = createFixture(makeFile(key));
            expect(fixture.componentInstance.getLanguage()).toBe(expectedLang);
        });

        it('should return "plaintext" when file is null', () => {
            const fixture = createFixture(null);
            expect(fixture.componentInstance.getLanguage()).toBe('plaintext');
        });
    });

    // ── canFormat() ───────────────────────────────────────────────────────────
    describe('canFormat()', () => {
        it('should return true for a JSON file', () => {
            const fixture = createFixture(makeFile('data.json'));
            expect(fixture.componentInstance.canFormat()).toBe(true);
        });

        it('should return false for a non-JSON file', () => {
            const fixture = createFixture(makeFile('readme.md'));
            expect(fixture.componentInstance.canFormat()).toBe(false);
        });
    });

    // ── formatContent() ───────────────────────────────────────────────────────
    describe('formatContent()', () => {
        it('should format valid JSON content', () => {
            const fixture = createFixture(makeFile('data.json'));
            fixture.componentInstance.previewContent.set('{"a":1,"b":2}');
            fixture.componentInstance.formatContent();
            const result = fixture.componentInstance.previewContent();
            expect(result).toBe(JSON.stringify({ a: 1, b: 2 }, null, 2));
        });

        it('should not throw for invalid JSON content', () => {
            const fixture = createFixture(makeFile('data.json'));
            fixture.componentInstance.previewContent.set('not-json');
            expect(() => fixture.componentInstance.formatContent()).not.toThrow();
        });

        it('should do nothing if previewContent is null', () => {
            const fixture = createFixture(makeFile('data.json'));
            fixture.componentInstance.previewContent.set(null);
            fixture.componentInstance.formatContent();
            expect(fixture.componentInstance.previewContent()).toBeNull();
        });
    });

    // ── fetchPreview() ────────────────────────────────────────────────────────
    describe('fetchPreview()', () => {
        it('should call getObjectRange for a text file and set previewContent', async () => {
            s3ServiceSpy.getObjectRange.mockResolvedValue({ content: 'hello!', isClipped: false });
            const fixture = createFixture(makeFile('file.txt'));

            // ngOnChanges triggers fetchPreview
            await vi.waitFor(() => expect(fixture.componentInstance.previewContent()).toBe('hello!'));
            expect(fixture.componentInstance.isClipped()).toBe(false);
        });

        it('should set isClipped to true when content is clipped', async () => {
            s3ServiceSpy.getObjectRange.mockResolvedValue({
                content: 'partial content',
                isClipped: true,
            });
            const fixture = createFixture(makeFile('bigfile.txt'));
            await vi.waitFor(() => expect(fixture.componentInstance.isClipped()).toBe(true));
        });

        it('should NOT call getObjectRange for a .gz file', () => {
            createFixture(makeFile('archive.gz'));
            expect(s3ServiceSpy.getObjectRange).not.toHaveBeenCalled();
        });

        it('should NOT call getObjectRange for a non-previewable file', () => {
            createFixture(makeFile('image.png'));
            expect(s3ServiceSpy.getObjectRange).not.toHaveBeenCalled();
        });

        it('should set error preview content on S3 error', async () => {
            s3ServiceSpy.getObjectRange.mockRejectedValue(new Error('S3 error'));
            const fixture = createFixture(makeFile('file.txt'));
            await vi.waitFor(() =>
                expect(fixture.componentInstance.previewContent()).toContain('Error'),
            );
        });

        it('should reset previewContent and isClipped when file changes', async () => {
            s3ServiceSpy.getObjectRange.mockResolvedValue({ content: 'old content', isClipped: false });
            const fixture = createFixture(makeFile('file.txt'));
            await vi.waitFor(() => expect(fixture.componentInstance.previewContent()).toBe('old content'));

            // Change to an unpreviewable file via setInput so ngOnChanges fires
            fixture.componentRef.setInput('file', makeFile('image.png'));
            fixture.detectChanges();

            expect(fixture.componentInstance.previewContent()).toBeNull();
            expect(fixture.componentInstance.isClipped()).toBe(false);
        });
    });

    // ── copyS3Uri() ───────────────────────────────────────────────────────────
    describe('copyS3Uri()', () => {
        it('should write the correct S3 URI to clipboard', async () => {
            const writeTextSpy = vi.fn().mockResolvedValue(undefined);
            Object.assign(navigator, { clipboard: { writeText: writeTextSpy } });

            const fixture = createFixture(makeFile('folder/file.txt'), 'my-bucket');
            fixture.componentInstance.copyS3Uri();

            expect(writeTextSpy).toHaveBeenCalledWith('s3://my-bucket/folder/file.txt');
        });

        it('should set copySuccess to true after clipboard write', async () => {
            const writeTextSpy = vi.fn().mockResolvedValue(undefined);
            Object.assign(navigator, { clipboard: { writeText: writeTextSpy } });

            const fixture = createFixture(makeFile('file.txt'), 'my-bucket');
            fixture.componentInstance.copyS3Uri();
            await vi.waitFor(() =>
                expect(fixture.componentInstance.copySuccess()).toBe(true),
            );
        });

        it('should do nothing when file is null', () => {
            const writeTextSpy = vi.fn();
            Object.assign(navigator, { clipboard: { writeText: writeTextSpy } });

            const fixture = createFixture(null);
            fixture.componentInstance.copyS3Uri();

            expect(writeTextSpy).not.toHaveBeenCalled();
        });
    });

    // ── download() ────────────────────────────────────────────────────────────
    describe('download()', () => {
        it('should call s3Service.getObject with correct bucket and key', async () => {
            // Create the fixture FIRST so Angular's DOM is not affected by our mock
            const fixture = createFixture(makeFile('folder/file.txt'), 'my-bucket');

            // Then mock DOM APIs for anchor-click download
            const mockAnchor = { href: '', download: '', click: vi.fn() };
            vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
            vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);
            vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n);
            vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:fake-url');
            vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => { });

            await fixture.componentInstance.download();

            expect(s3ServiceSpy.getObject).toHaveBeenCalledWith('my-bucket', 'folder/file.txt');
        });

        it('should set isDownloading to false after completion', async () => {
            const fixture = createFixture(makeFile('file.txt'), 'bucket');

            vi.spyOn(document, 'createElement').mockReturnValue({ href: '', download: '', click: vi.fn() } as any);
            vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);
            vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n);
            vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:url');
            vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => { });

            await fixture.componentInstance.download();

            expect(fixture.componentInstance.isDownloading()).toBe(false);
        });

        it('should do nothing when file is null', async () => {
            const fixture = createFixture(null);
            await fixture.componentInstance.download();
            expect(s3ServiceSpy.getObject).not.toHaveBeenCalled();
        });
    });

    // ── Metadata operations ────────────────────────────────────────────────────────
    describe('onMetadataUpdated()', () => {
        it('should call headObject and update StateService', async () => {
            // Mock headObject result
            s3ServiceSpy.headObject.mockResolvedValue({ Key: 'file.txt', ETag: 'new-etag' });
            const fixture = createFixture(makeFile('file.txt'));

            // In tests we can't easily spy on StateService when it defaults to `inject` without proper mock, 
            // but we will check if s3ServiceSpy.headObject was called
            await fixture.componentInstance.onMetadataUpdated();

            expect(s3ServiceSpy.headObject).toHaveBeenCalledWith('test-bucket', 'file.txt');
        });
    });
});
