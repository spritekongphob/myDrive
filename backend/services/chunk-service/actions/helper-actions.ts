import { env } from "process";
import { MinioActions } from "../actions/file-system-actions";
import { MinIOActions } from "../actions/minio-action"; 

export const getStorageActions = () => {
  if (env.DB_TYPE === "minio") {
    return new MinIOActions();  // ใช้คลาสที่รองรับ MinIO
  } else {
    return new MinioActions();  // ใช้คลาสไฟล์ระบบ (FS)
  }
};
