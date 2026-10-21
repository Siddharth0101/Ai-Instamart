import { createCipheriv,createDecipheriv,randomBytes,createHash,timingSafeEqual } from "node:crypto";
import { AppError } from "./errors";
export const opaqueId=(prefix:string)=>`${prefix}_${randomBytes(18).toString("base64url")}`;
export const fingerprint=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function canonicalFingerprint(value:unknown):string {
  const canonical=(input:unknown):unknown=>Array.isArray(input)?input.map(canonical):input!==null&&typeof input==="object"?Object.fromEntries(Object.entries(input).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,item])=>[key,canonical(item)])):input;
  return fingerprint(canonical(value));
}
export function equalSecret(a:string,b:string) {const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function key() {
  const bytes=Buffer.from(process.env.TOKEN_ENCRYPTION_KEY||"","base64");
  if(bytes.length!==32) throw new AppError("ENCRYPTION_KEY_REQUIRED","Configure TOKEN_ENCRYPTION_KEY with 32 random bytes encoded as base64 before connecting Swiggy.",503);
  return bytes;
}
export function seal(value:unknown,ownerId:string) {
  const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv);
  cipher.setAAD(Buffer.from(ownerId));
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),"utf8"),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64");
}
export function unseal<T>(value:string,ownerId:string):T {
  const buffer=Buffer.from(value,"base64"),decipher=createDecipheriv("aes-256-gcm",key(),buffer.subarray(0,12));
  decipher.setAAD(Buffer.from(ownerId));decipher.setAuthTag(buffer.subarray(12,28));
  return JSON.parse(Buffer.concat([decipher.update(buffer.subarray(28)),decipher.final()]).toString("utf8")) as T;
}
