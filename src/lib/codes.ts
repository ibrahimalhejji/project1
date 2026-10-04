import { randomBytes } from "node:crypto";

/** Human-friendly reference code such as REG-7K3Q9D (no ambiguous characters). Server only. */
export function generateCode(prefix = "CMC"): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `${prefix}-${out}`;
}
