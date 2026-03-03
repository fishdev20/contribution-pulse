import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../src/server/crypto/encryption";

describe("encryption helper", () => {
  it("round-trips plaintext with AES-256-GCM", () => {
    process.env.MASTER_KEY = Buffer.alloc(32, 7).toString("base64");
    const plaintext = "sensitive-token-value";

    const encrypted = encryptSecret(plaintext);
    const decrypted = decryptSecret(encrypted);

    expect(decrypted).toBe(plaintext);
    expect(encrypted.ciphertext).not.toBe(plaintext);
  });

  it("fails decryption with modified tag", () => {
    process.env.MASTER_KEY = Buffer.alloc(32, 9).toString("base64");
    const encrypted = encryptSecret("abc");
    encrypted.tag = Buffer.alloc(16, 0).toString("base64");

    expect(() => decryptSecret(encrypted)).toThrow();
  });
});
