import env from "../../../enviroment/env"; 
import { GenericParams, IStorageActions } from "../store-types";
import internal, { EventEmitter } from "stream";
import { Client as MinioClient } from "minio";
import stream from "stream";

class MinIOActions implements IStorageActions {
  minioClient: MinioClient;

  constructor() {
  // เพิ่ม http:// ถ้า env.MINIO_ENDPOINT ไม่มี protocol
  const endpoint = env.MINIO_ENDPOINT || 'localhost';
  const fullEndpoint = endpoint.includes('://') ? endpoint : `http://${endpoint}`;
  
  this.minioClient = new MinioClient({
    endPoint: fullEndpoint.replace("http://", "").replace("https://", ""),
    port: 9000,
    useSSL: fullEndpoint.startsWith("https://"),
    accessKey: env.MINIO_ACCESS_KEY!,
    secretKey: env.MINIO_SECRET_KEY!,
  });
}

  getAuth() {
    return { minioStorage: this.minioClient, bucket: env.MINIO_BUCKET! };
  }

  createReadStream(params: GenericParams): internal.Readable {
    if (!params.Key) throw new Error("MinIO not configured");
    const { minioStorage, bucket } = this.getAuth();
    
    // สร้าง PassThrough stream ที่เราจะส่งข้อมูลไปยัง
    const passThrough = new (require('stream')).PassThrough();
    
    // เรียก getObject แล้วส่งข้อมูลไปยัง passThrough
    minioStorage.getObject(bucket, params.Key)
      .then(stream => {
        stream.pipe(passThrough);
      })
      .catch(err => {
        passThrough.emit('error', err);
      });
    
    // ส่งคืน passThrough stream ทันที
    return passThrough;
  }

  async createReadStreamWithRange(
    params: GenericParams,
    start: number,
    end: number
  ): Promise<internal.Readable> {
    if (!params.Key) throw new Error("MinIO not configured");
    const { minioStorage, bucket } = this.getAuth();
    const stream = await minioStorage.getPartialObject(bucket, params.Key, start, end - start + 1);
    return stream;
  }

  async removeChunks(params: GenericParams) {
    if (!params.Key) {
      throw new Error("MinIO not configured");
    }
    const { minioStorage, bucket } = this.getAuth();
    await minioStorage.removeObject(bucket, params.Key);
  }

  async getPrevIV(params: GenericParams, start: number): Promise<Buffer> {
    if (!params.Key) throw new Error("MinIO not configured");
    const { minioStorage, bucket } = this.getAuth();
    const length = 16;
    const readStream = await minioStorage.getPartialObject(bucket, params.Key, start, length);

    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      readStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      readStream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      readStream.on("error", reject);
    });
  }

  createWriteStream(
    params: GenericParams,
    readStream: NodeJS.ReadableStream,
    randomID: string
  ) {
    const passThrough = new stream.PassThrough();
    const emitter = new EventEmitter();

    const { minioStorage, bucket } = this.getAuth();

    minioStorage.putObject(bucket, randomID, passThrough)
      .then(() => emitter.emit("finish"))
      .catch((err: any) => emitter.emit("error", err));

    return { writeStream: passThrough, emitter };
  }
}

export { MinIOActions };
