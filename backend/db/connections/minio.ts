const Minio = require('minio');
import env from '../../enviroment/env';     
import dotenv from 'dotenv';

dotenv.config();


const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT|| 'localhost',
  port: parseInt(process.env.MINIO_PORT!),
  useSSL: process.env.MINIO_USE_SSL === "false",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});


// ทดสอบการเชื่อมต่อ
const bucketName = process.env.MINIO_BUCKET || "DMS-bucket";
minioClient.bucketExists(bucketName, (err: any, exists: any) => {
  if (err) {
    console.error("MinIO Error:", err);
  } else if (!exists) {
    minioClient.makeBucket(bucketName, "us-east-1", (err: any) => {
      if (err) console.error("Error creating bucket:", err);
      else console.log(`MinIO Bucket '${bucketName}' created successfully`);
    });
  }
});

// กำหนดค่าการเชื่อมต่อ MinIO
// const minioClient = new Minio.Client({
//   endPoint: process.env.MINIO_ENDPOINT || 'localhost', 
//   port: 9001, // หรือพอร์ตที่ MinIO ใช้
//   useSSL: false, // ถ้าใช้ HTTPS ให้ตั้งเป็น true
//   accessKey: process.env.MINIO_ACCESS_KEY ,
//   secretKey: process.env.MINIO_SECRET_KEY 
// });
