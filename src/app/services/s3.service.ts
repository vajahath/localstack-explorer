import { Injectable, signal, inject } from '@angular/core';
import { NotificationService } from './notification.service';
import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  CommonPrefix,
  _Object,
} from '@aws-sdk/client-s3';

export interface S3ListResult {
  prefixes: CommonPrefix[];
  objects: _Object[];
  nextContinuationToken?: string;
}

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
}
