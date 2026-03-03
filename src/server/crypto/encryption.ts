import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function getMasterKey(): Buffer {
  const encoded = process.env.MASTER_KEY;
  if (!encoded) throw new Error("MASTER_KEY env var is required");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("MASTER_KEY must be base64 32 bytes");
  return key;
}

export type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  tag: string;
};

export function encryptSecret(plaintext: string): EncryptedSecret {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getMasterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptSecret(payload: EncryptedSecret): string {
  const decipher = crypto.createDecipheriv(ALGO, getMasterKey(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
