import { Injectable, signal } from '@angular/core';
import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
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
  readonly endpoint = signal<string | null>(null);

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
  }

  disconnect() {
    this.client?.destroy();
    this.client = null;
    this.endpoint.set(null);
  }

  async listBuckets() {
    if (!this.client) throw new Error('S3 Client not connected');
    const command = new ListBucketsCommand({});
    const response = await this.client.send(command);
    return response.Buckets || [];
  }

  async listObjects(
    bucket: string,
    prefix: string = '',
    continuationToken?: string,
  ): Promise<S3ListResult> {
    if (!this.client) throw new Error('S3 Client not connected');

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
  }

  async getObject(bucket: string, key: string): Promise<Blob> {
    if (!this.client) throw new Error('S3 Client not connected');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    const body = await response.Body?.transformToByteArray();
    if (!body) throw new Error('Empty response body');
    return new Blob([body]);
  }

  async getObjectRange(
    bucket: string,
    key: string,
    bytes: number,
  ): Promise<{ content: string; isClipped: boolean }> {
    if (!this.client) throw new Error('S3 Client not connected');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: `bytes=0-${bytes - 1}`,
    });

    try {
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
      console.error('Error fetching object range:', error);
      throw error;
    }
  }

  async getObjectBinaryRange(
    bucket: string,
    key: string,
    bytes: number,
  ): Promise<Uint8Array> {
    if (!this.client) throw new Error('S3 Client not connected');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: `bytes=0-${bytes - 1}`,
    });

    const response = await this.client.send(command);
    return (await response.Body?.transformToByteArray()) || new Uint8Array();
  }
}
