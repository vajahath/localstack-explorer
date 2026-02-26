import { TestBed } from '@angular/core/testing';
import { S3Service } from './s3.service';
import { NotificationService } from './notification.service';

// vi.mock is hoisted to the top of the file, so the factory must not reference
// variables declared after it. Use vi.hoisted() to declare mocks that can be
// referenced inside the factory:
const mockClientInstance = vi.hoisted(() => ({
    send: vi.fn(),
    destroy: vi.fn(),
}));

// Replace the AWS module before any import of S3Service
vi.mock('@aws-sdk/client-s3', () => {
    function MockS3Client() {
        return mockClientInstance;
    }
    class MockCommand { constructor(public input: unknown) { } }
    return {
        S3Client: MockS3Client,
        ListBucketsCommand: MockCommand,
        ListObjectsV2Command: MockCommand,
        GetObjectCommand: MockCommand,
        HeadObjectCommand: MockCommand,
        CopyObjectCommand: MockCommand,
        PutObjectCommand: MockCommand,
        CreateMultipartUploadCommand: MockCommand,
        UploadPartCommand: MockCommand,
        CompleteMultipartUploadCommand: MockCommand,
        AbortMultipartUploadCommand: MockCommand,
    };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn().mockResolvedValue('https://mock-presigned-url.com/image.png')
}));

describe('S3Service', () => {
    let service: S3Service;
    let notificationSpy: {
        success: ReturnType<typeof vi.fn>;
        error: ReturnType<typeof vi.fn>;
        info: ReturnType<typeof vi.fn>;
    };

    const TEST_ENDPOINT = 'http://localhost:4566/';

    beforeEach(() => {
        vi.clearAllMocks();

        notificationSpy = {
            success: vi.fn(),
            error: vi.fn(),
            info: vi.fn(),
        };

        TestBed.configureTestingModule({
            providers: [S3Service, { provide: NotificationService, useValue: notificationSpy }],
        });

        service = TestBed.inject(S3Service);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should have a null endpoint signal initially', () => {
        expect(service.endpoint()).toBeNull();
    });

    // ── connect() ─────────────────────────────────────────────────────────────
    describe('connect()', () => {
        it('should set the endpoint signal', () => {
            service.connect(TEST_ENDPOINT);
            expect(service.endpoint()).toBe(TEST_ENDPOINT);
        });

        it('should emit a success notification', () => {
            service.connect(TEST_ENDPOINT);
            expect(notificationSpy.success).toHaveBeenCalledWith(
                expect.stringContaining(TEST_ENDPOINT),
                'Connection',
            );
        });
    });

    // ── disconnect() ──────────────────────────────────────────────────────────
    describe('disconnect()', () => {
        it('should clear the endpoint signal', () => {
            service.connect(TEST_ENDPOINT);
            service.disconnect();
            expect(service.endpoint()).toBeNull();
        });

        it('should emit an info notification', () => {
            service.connect(TEST_ENDPOINT);
            service.disconnect();
            expect(notificationSpy.info).toHaveBeenCalledWith('Disconnected from S3', 'Connection');
        });
    });

    // ── listBuckets() ─────────────────────────────────────────────────────────
    describe('listBuckets()', () => {
        it('should throw when client is not connected', async () => {
            await expect(service.listBuckets()).rejects.toThrow('S3 Client not connected');
        });

        it('should return an array of buckets on success', async () => {
            service.connect(TEST_ENDPOINT);
            const mockBuckets = [{ Name: 'bucket-one' }, { Name: 'bucket-two' }];
            mockClientInstance.send.mockResolvedValue({ Buckets: mockBuckets });

            const result = await service.listBuckets();
            expect(result).toEqual(mockBuckets);
        });

        it('should return an empty array if the response has no Buckets', async () => {
            service.connect(TEST_ENDPOINT);
            mockClientInstance.send.mockResolvedValue({});

            const result = await service.listBuckets();
            expect(result).toEqual([]);
        });

        it('should call error notification and rethrow on failure', async () => {
            service.connect(TEST_ENDPOINT);
            mockClientInstance.send.mockRejectedValue(new Error('Network Error'));

            await expect(service.listBuckets()).rejects.toThrow('Network Error');
            expect(notificationSpy.error).toHaveBeenCalledWith('Network Error', 'Listing Buckets');
        });
    });

    // ── listObjects() ─────────────────────────────────────────────────────────
    describe('listObjects()', () => {
        it('should throw when not connected', async () => {
            await expect(service.listObjects('bucket')).rejects.toThrow('S3 Client not connected');
        });

        it('should return prefixes, objects, and nextContinuationToken', async () => {
            service.connect(TEST_ENDPOINT);
            mockClientInstance.send.mockResolvedValue({
                CommonPrefixes: [{ Prefix: 'folder/' }],
                Contents: [{ Key: 'file.txt' }, { Key: 'prefix/' }],
                NextContinuationToken: 'token-123',
            });

            const result = await service.listObjects('bucket', 'prefix/');
            expect(result.prefixes).toEqual([{ Prefix: 'folder/' }]);
            // Keys equal to the prefix itself should be filtered out
            expect(result.objects).toEqual([{ Key: 'file.txt' }]);
            expect(result.nextContinuationToken).toBe('token-123');
        });

        it('should handle an empty listing gracefully', async () => {
            service.connect(TEST_ENDPOINT);
            mockClientInstance.send.mockResolvedValue({});

            const result = await service.listObjects('bucket', '');
            expect(result.prefixes).toEqual([]);
            expect(result.objects).toEqual([]);
            expect(result.nextContinuationToken).toBeUndefined();
        });

        it('should pass the continuationToken to the S3 command', async () => {
            service.connect(TEST_ENDPOINT);
            mockClientInstance.send.mockResolvedValue({});

            await service.listObjects('bucket', '', 'my-token');
            expect(mockClientInstance.send).toHaveBeenCalledWith(
                expect.objectContaining({ input: expect.objectContaining({ ContinuationToken: 'my-token' }) }),
            );
        });

        it('should call error notification and rethrow on failure', async () => {
            service.connect(TEST_ENDPOINT);
            mockClientInstance.send.mockRejectedValue(new Error('S3 Error'));

            await expect(service.listObjects('bucket')).rejects.toThrow('S3 Error');
            expect(notificationSpy.error).toHaveBeenCalledWith('S3 Error', 'Listing Objects');
        });
    });

    // ── getObject() ───────────────────────────────────────────────────────────
    describe('getObject()', () => {
        it('should throw when not connected', async () => {
            await expect(service.getObject('bucket', 'key')).rejects.toThrow('S3 Client not connected');
        });

        it('should return a Blob on success', async () => {
            service.connect(TEST_ENDPOINT);
            const mockBytes = new Uint8Array([72, 101, 108, 108, 111]);
            mockClientInstance.send.mockResolvedValue({
                Body: { transformToByteArray: vi.fn().mockResolvedValue(mockBytes) },
            });

            const result = await service.getObject('bucket', 'key.txt');
            expect(result).toBeInstanceOf(Blob);
        });

        it('should throw if response Body is empty', async () => {
            service.connect(TEST_ENDPOINT);
            mockClientInstance.send.mockResolvedValue({ Body: undefined });

            await expect(service.getObject('bucket', 'key.txt')).rejects.toThrow();
        });
    });

    // ── getObjectRange() ──────────────────────────────────────────────────────
    describe('getObjectRange()', () => {
        it('should throw when not connected', async () => {
            await expect(service.getObjectRange('bucket', 'key', 1024)).rejects.toThrow('S3 Client not connected');
        });

        it('should return content string and isClipped=false for a small file', async () => {
            service.connect(TEST_ENDPOINT);
            mockClientInstance.send.mockResolvedValue({
                Body: { transformToString: vi.fn().mockResolvedValue('hello world') },
                ContentRange: 'bytes 0-10/11',
                ContentLength: 11,
            });

            const result = await service.getObjectRange('bucket', 'key.txt', 1024 * 5);
            expect(result.content).toBe('hello world');
            expect(result.isClipped).toBe(false);
        });

        it('should return isClipped=true when file is larger than requested range', async () => {
            service.connect(TEST_ENDPOINT);
            mockClientInstance.send.mockResolvedValue({
                Body: { transformToString: vi.fn().mockResolvedValue('...content...') },
                ContentRange: 'bytes 0-5119/100000',
                ContentLength: 5120,
            });

            const result = await service.getObjectRange('bucket', 'key.txt', 1024 * 5);
            expect(result.isClipped).toBe(true);
        });

        it('should return an empty string if body is undefined', async () => {
            service.connect(TEST_ENDPOINT);
            mockClientInstance.send.mockResolvedValue({
                Body: { transformToString: vi.fn().mockResolvedValue(undefined) },
                ContentLength: 0,
            });

            const result = await service.getObjectRange('bucket', 'key.txt', 1024 * 5);
            expect(result.content).toBe('');
        });
    });

    // ── getObjectBinaryRange() ────────────────────────────────────────────────
    describe('getObjectBinaryRange()', () => {
        it('should throw when not connected', async () => {
            await expect(service.getObjectBinaryRange('bucket', 'key', 1024)).rejects.toThrow('S3 Client not connected');
        });

        it('should return a Uint8Array on success', async () => {
            service.connect(TEST_ENDPOINT);
            const mockBytes = new Uint8Array([1, 2, 3]);
            mockClientInstance.send.mockResolvedValue({
                Body: { transformToByteArray: vi.fn().mockResolvedValue(mockBytes) },
            });

            const result = await service.getObjectBinaryRange('bucket', 'key.gz', 1024);
            expect(result).toEqual(mockBytes);
        });

        it('should return an empty Uint8Array if body is undefined', async () => {
            service.connect(TEST_ENDPOINT);
            mockClientInstance.send.mockResolvedValue({
                Body: { transformToByteArray: vi.fn().mockResolvedValue(undefined) },
            });

            const result = await service.getObjectBinaryRange('bucket', 'key.gz', 1024);
            expect(result).toEqual(new Uint8Array());
        });
    });
});
