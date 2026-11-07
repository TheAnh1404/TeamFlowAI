import "server-only";
import {createCipheriv,createDecipheriv,randomBytes} from "node:crypto";
import {HttpError} from "@/server/http/errors";

export function encryptionKey():Buffer {
  const configured=process.env.AI_SETTINGS_ENCRYPTION_KEY?.trim();
  if(configured){const key=Buffer.from(configured,"base64");if(key.length===32)return key;throw new HttpError(503,"AI_SETTINGS_NOT_READY","Máy chủ chưa cấu hình khóa mã hóa hợp lệ.");}
  throw new HttpError(503,"AI_SETTINGS_NOT_READY","Máy chủ Neon cần cấu hình AI_SETTINGS_ENCRYPTION_KEY trước khi lưu API key.");
}
export function encryptApiKey(secret:string,userId:string,key=encryptionKey()):string {
  const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,iv);cipher.setAAD(Buffer.from(userId));
  const encrypted=Buffer.concat([cipher.update(secret,"utf8"),cipher.final()]);
  return ["v1",iv.toString("base64"),cipher.getAuthTag().toString("base64"),encrypted.toString("base64")].join(".");
}
export function decryptApiKey(value:string,userId:string,key=encryptionKey()):string {
  try {const [version,iv,tag,body]=value.split(".");if(version!=="v1"||!iv||!tag||!body)throw Error();
    const cipher=createDecipheriv("aes-256-gcm",key,Buffer.from(iv,"base64"));cipher.setAAD(Buffer.from(userId));cipher.setAuthTag(Buffer.from(tag,"base64"));
    return Buffer.concat([cipher.update(Buffer.from(body,"base64")),cipher.final()]).toString("utf8");
  }catch{throw new HttpError(503,"AI_SETTINGS_NOT_READY","Chưa mở được API key đã lưu. Hãy nhập lại khóa hoặc kiểm tra khóa mã hóa trên máy chủ.");}
}
