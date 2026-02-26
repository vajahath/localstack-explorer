import { Injectable, signal, inject } from '@angular/core';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NotificationService } from './notification.service';
import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  CommonPrefix,
  _Object,
  CompletedPart,
} from '@aws-sdk/client-s3';

export interface S3ListResult {
  prefixes: CommonPrefix[];
  objects: _Object[];
  nextContinuationToken?: string;
}

/** Progress callback: 0 to 1 */
export type UploadProgressCallback = (progress: number) => void;

/** Multipart threshold and chunk size */
const MULTIPART_THRESHOLD = 20 * 1024 * 1024; // 20 MB
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_CONCURRENT_PARTS = 3;

@Injectable({
  providedIn: 'root',
})
export class S3Service {
  private client: S3Client | null = null;
  private notificationService = inject(NotificationService);
  readonly endpoint = signal<string | null>(null);

  private handleError(error: any, context: string): never {
    console.error(`[S3Service] ${context}:`, error);
    const message = error?.message || 'An unknown error occurred';
    this.notificationService.error(message, context);
    throw error;
  }

  connect(endpointUrl: string) {
    this.client = new S3Client({
      endpoint: endpointUrl,
      region: 'us-east-1', // Default region for LocalStack
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
      forcePathStyle: true, // Required for LocalStack
    });
    this.endpoint.set(endpointUrl);
    this.notificationService.success(`Connected to ${endpointUrl}`, 'Connection');
  }

  disconnect() {
    this.client?.destroy();
    this.client = null;
    this.endpoint.set(null);
    this.notificationService.info('Disconnected from S3', 'Connection');
  }

  async listBuckets() {
    if (!this.client) throw new Error('S3 Client not connected');
    try {
      const command = new ListBucketsCommand({});
      const response = await this.client.send(command);
      return response.Buckets || [];
    } catch (error) {
      this.handleError(error, 'Listing Buckets');
    }
  }

  async listObjects(
    bucket: string,
    prefix: string = '',
    continuationToken?: string,
  ): Promise<S3ListResult> {
    if (!this.client) throw new Error('S3 Client not connected');

    try {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: '/',
        ContinuationToken: continuationToken,
        MaxKeys: 50, // Chunk size for pagination
      });

      const response = await this.client.send(command);

      return {
        prefixes: response.CommonPrefixes || [],
        objects: response.Contents?.filter((obj) => obj.Key !== prefix) || [], // Filter out the directory object itself if it exists
        nextContinuationToken: response.NextContinuationToken,
      };
    } catch (error) {
      this.handleError(error, 'Listing Objects');
    }
  }

  async getObject(bucket: string, key: string): Promise<Blob> {
    if (!this.client) throw new Error('S3 Client not connected');
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      const response = await this.client.send(command);
      const body = await response.Body?.transformToByteArray();
      if (!body) throw new Error('Empty response body');
      return new Blob([body]);
    } catch (error) {
      this.handleError(error, 'Downloading Object');
    }
  }

  async getObjectRange(
    bucket: string,
    key: string,
    bytes: number,
  ): Promise<{ content: string; isClipped: boolean }> {
    if (!this.client) throw new Error('S3 Client not connected');

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: `bytes=0-${bytes - 1}`,
      });

      const response = await this.client.send(command);
      const text = await response.Body?.transformToString();
      const contentRange = response.ContentRange || '';
      const totalSize = contentRange
        ? parseInt(contentRange.split('/')[1])
        : response.ContentLength || 0;

      return {
        content: text || '',
        isClipped: totalSize > bytes,
      };
    } catch (error) {
      this.handleError(error, 'Fetching Preview');
    }
  }

  async getPresignedUrl(bucket: string, key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.client) throw new Error('S3 Client not connected');
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      this.handleError(error, 'Generating Link');
    }
  }

  async getObjectBinaryRange(
    bucket: string,
    key: string,
    bytes: number,
  ): Promise<Uint8Array> {
    if (!this.client) throw new Error('S3 Client not connected');

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: `bytes=0-${bytes - 1}`,
      });

      const response = await this.client.send(command);
      return (await response.Body?.transformToByteArray()) || new Uint8Array();
    } catch (error) {
      this.handleError(error, 'Loading Binary Content');
    }
  }

  async getObjectMetadata(bucket: string, key: string): Promise<Record<string, string>> {
    if (!this.client) throw new Error('S3 Client not connected');
    try {
      const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
      const response = await this.client.send(command);
      return response.Metadata || {};
    } catch (error) {
      this.handleError(error, 'Fetching Metadata');
    }
  }

  async headObject(bucket: string, key: string): Promise<_Object> {
    if (!this.client) throw new Error('S3 Client not connected');
    try {
      const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
      const response = await this.client.send(command);
      return {
        Key: key,
        LastModified: response.LastModified,
        ETag: response.ETag,
        Size: response.ContentLength,
        StorageClass: response.StorageClass as any,
      };
    } catch (error) {
      this.handleError(error, 'Fetching Object Info');
    }
  }

  async updateObjectMetadata(bucket: string, key: string, metadata: Record<string, string>, silent: boolean = false) {
    if (!this.client) throw new Error('S3 Client not connected');
    try {
      const command = new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${encodeURIComponent(bucket)}/${encodeURIComponent(key).replace(/%2F/g, '/')}`,
        Key: key,
        Metadata: metadata,
        MetadataDirective: 'REPLACE',
      });
      await this.client.send(command);
      if (!silent) {
        this.notificationService.success('Metadata updated successfully', 'Metadata');
      }
    } catch (error) {
      this.handleError(error, 'Updating Metadata');
    }
  }

  async updateObjectMetadataSilent(bucket: string, key: string, metadata: Record<string, string>) {
    return this.updateObjectMetadata(bucket, key, metadata, true);
  }

  async createFolder(bucket: string, prefix: string, folderName: string) {
    if (!this.client) throw new Error('S3 Client not connected');
    try {
      // S3 folders are just objects with a trailing slash
      const key = `${prefix}${folderName}/`;
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: new Uint8Array(),
      });
      await this.client.send(command);
    } catch (error) {
      this.handleError(error, `Creating folder ${folderName}`);
    }
  }

  async uploadObject(bucket: string, key: string, file: File, onProgress?: UploadProgressCallback): Promise<void> {
    if (!this.client) throw new Error('S3 Client not connected');

    if (file.size > MULTIPART_THRESHOLD) {
      return this.multipartUpload(bucket, key, file, onProgress);
    }

    try {
      const body = new Uint8Array(await file.arrayBuffer());
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: file.type || 'application/octet-stream',
      });
      await this.client.send(command);
      onProgress?.(1);
    } catch (error) {
      this.handleError(error, `Uploading ${file.name}`);
    }
  }

  private async multipartUpload(bucket: string, key: string, file: File, onProgress?: UploadProgressCallback): Promise<void> {
    if (!this.client) throw new Error('S3 Client not connected');

    const totalParts = Math.ceil(file.size / CHUNK_SIZE);
    let completedParts = 0;
    let uploadId: string | undefined;

    try {
      // 1. Initiate multipart upload
      const initResponse = await this.client.send(new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        ContentType: file.type || 'application/octet-stream',
      }));
      uploadId = initResponse.UploadId;

      if (!uploadId) throw new Error('Failed to initiate multipart upload');

      // 2. Upload parts with limited concurrency
      const parts: CompletedPart[] = [];
      const partQueue: Array<{ partNumber: number; start: number; end: number }> = [];

      for (let i = 0; i < totalParts; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        partQueue.push({ partNumber: i + 1, start, end });
      }

      // Process parts with concurrency limit
      let queueIndex = 0;
      const processPart = async (): Promise<void> => {
        while (queueIndex < partQueue.length) {
          const current = partQueue[queueIndex++];
          const chunk = file.slice(current.start, current.end);
          const body = new Uint8Array(await chunk.arrayBuffer());

          const uploadPartResponse = await this.client!.send(new UploadPartCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: current.partNumber,
            Body: body,
          }));

          parts.push({
            ETag: uploadPartResponse.ETag,
            PartNumber: current.partNumber,
          });

          completedParts++;
          onProgress?.(completedParts / totalParts);
        }
      };

      // Launch workers up to MAX_CONCURRENT_PARTS
      const workers = Array.from(
        { length: Math.min(MAX_CONCURRENT_PARTS, totalParts) },
        () => processPart(),
      );
      await Promise.all(workers);

      // 3. Complete multipart upload (parts must be sorted by PartNumber)
      parts.sort((a, b) => (a.PartNumber ?? 0) - (b.PartNumber ?? 0));

      await this.client.send(new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      }));

    } catch (error) {
      // Abort the multipart upload on failure to clean up partial parts
      if (uploadId) {
        try {
          await this.client!.send(new AbortMultipartUploadCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
          }));
        } catch (abortError) {
          console.error('[S3Service] Failed to abort multipart upload:', abortError);
        }
      }
      this.handleError(error, `Uploading ${file.name}`);
    }
  }
}
