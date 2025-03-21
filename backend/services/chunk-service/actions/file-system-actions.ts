import * as Minio from 'minio';
import { Readable } from 'stream';
import { PassThrough } from 'stream';
import { GenericParams, IStorageActions } from '../store-types';
import env from '../../../enviroment/env';

class MinioActions implements IStorageActions {
  private minioClient: Minio.Client;

  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: env.MINIO_ENDPOINT,
      port: parseInt(env.MINIO_PORT || '9000', 10),
      useSSL: false,  
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
  }

  async getAuth() {
    return {}; 
  }

  createReadStream(params: GenericParams): Readable {
    if (!params.filePath) throw new Error("File path not configured");
    const bucket = env.MINIO_BUCKET;
    const key = params.filePath;

    const passThrough = new PassThrough();
    
    this.minioClient.getObject(bucket, key)
      .then((stream) => {
        stream.pipe(passThrough);
      })
      .catch((err) => {
        passThrough.emit('error', err);
        passThrough.end();
      });

    return passThrough;
  }

  createReadStreamWithRange(params: GenericParams, start: number, end: number): Readable {
    if (!params.filePath) throw new Error("File path not configured");
    const bucket = env.MINIO_BUCKET;
    const key = params.filePath;

    const passThrough = new PassThrough();
    const opts: any = {
      Range: `bytes=${start}-${end}`
    };
    
    this.minioClient.getObject(bucket, key, opts)
      .then((stream) => {
        stream.pipe(passThrough);
      })
      .catch((err) => {
        passThrough.emit('error', err);
        passThrough.end();
      });

    return passThrough;
  }

  removeChunks(params: GenericParams): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!params.filePath) {
        reject(new Error("File path not configured"));
        return;
      }

      const bucket = env.MINIO_BUCKET;
      const key = params.filePath;

      this.minioClient.removeObject(bucket, key)
        .then(() => resolve())
        .catch((error: Error) => reject(new Error(`Error removing file from MinIO: ${error.message}`)));
    });
  }

  getPrevIV(params: GenericParams, start: number): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      if (!params.filePath) {
        reject(new Error("File path not configured"));
        return;
      }

      const bucket = env.MINIO_BUCKET;
      const key = params.filePath;

      const opts: any = {
        Range: `bytes=${start}-${start + 15}`
      };
      
      this.minioClient.getObject(bucket, key, opts)
        .then(stream => {
          const chunks: Buffer[] = [];
          
          stream.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });
          
          stream.on('end', () => {
            resolve(Buffer.concat(chunks));
          });
          
          stream.on('error', (err: Error) => {
            reject(err);
          });
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  uploadFile(params: GenericParams, inputStream: Readable): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!params.filePath) {
        reject(new Error("File path not configured"));
        return;
      }
      
      const bucket = env.MINIO_BUCKET;
      const key = params.filePath;

      const chunks: Buffer[] = [];
      let size = 0;
      
      inputStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        size += chunk.length;
      });
      
      inputStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        
        this.minioClient.putObject(bucket, key, buffer, size)
        .then(() => resolve())
        .catch((err: Error) => {
          reject(new Error(`Error uploading file to MinIO: ${err.message}`));
        });
      });
      
      inputStream.on('error', (err: Error) => {
        reject(new Error(`Stream error: ${err.message}`));
      });
    });
  }

  createWriteStream(
    params: GenericParams,
    inputStream: Readable,
    randomID: string
  ): { writeStream: Readable; emitter: null } {
    if (!randomID) {
      throw new Error("randomID not configured");
    }
    
    const bucket = env.MINIO_BUCKET;
    const key = randomID;

    let size = 0;
    const chunks: Buffer[] = [];
    
    inputStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      size += chunk.length;
    });
    
    inputStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      
      
      this.minioClient.putObject(bucket, key, buffer, size)
        .catch((err: Error) => {
          console.error(`Error uploading file to MinIO: ${err.message}`);
        });
    });
    
    return {
      writeStream: inputStream,
      emitter: null,
    };
  }
}

export { MinioActions };
