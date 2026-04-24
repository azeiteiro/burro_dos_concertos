import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import logger from "#/config/logger";

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

class R2StorageService {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(config: R2Config) {
    const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;

    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    this.bucketName = config.bucketName;
    this.publicUrl = config.publicUrl;

    logger.info({ bucketName: this.bucketName }, "R2 Storage Service initialized");
  }

  /**
   * Upload image buffer to R2
   * @param key - File path/key in bucket (e.g., "profile-photos/123.jpg")
   * @param buffer - Image data as Buffer
   * @param contentType - MIME type (e.g., "image/jpeg")
   * @returns Public URL of uploaded image
   */
  async uploadImage(key: string, buffer: Buffer, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.client.send(command);

      const publicUrl = `${this.publicUrl}/${key}`;
      logger.info({ key, publicUrl }, "Successfully uploaded image to R2");

      return publicUrl;
    } catch (error) {
      logger.error({ error, key }, "Failed to upload image to R2");
      throw error;
    }
  }

  /**
   * Check if image exists in R2
   * @param key - File path/key in bucket
   * @returns true if exists, false otherwise
   */
  async imageExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: unknown) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.error({ error, key }, "Error checking if image exists in R2");
      throw error;
    }
  }
}

// Singleton instance
let r2StorageInstance: R2StorageService | null = null;

export function getR2Storage(): R2StorageService {
  if (!r2StorageInstance) {
    const config: R2Config = {
      accountId: process.env.R2_ACCOUNT_ID!,
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      bucketName: process.env.R2_BUCKET_NAME!,
      publicUrl: process.env.R2_PUBLIC_URL!,
    };

    // Validate required env vars
    const missing = Object.entries(config)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(`Missing required R2 environment variables: ${missing.join(", ")}`);
    }

    r2StorageInstance = new R2StorageService(config);
  }

  return r2StorageInstance;
}

export { R2StorageService };
