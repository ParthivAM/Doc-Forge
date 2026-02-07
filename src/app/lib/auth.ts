// FILE: src/app/lib/auth.ts
import jwt, { SignOptions } from "jsonwebtoken";
import { hash, compare } from "bcryptjs";

// Use non-null assertion since we validate at runtime on Netlify
const JWT_SECRET = process.env.JWT_SECRET!;

export interface JwtSignOptions {
  expiresIn?: SignOptions['expiresIn'];
}

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hashValue: string
): Promise<boolean> {
  return compare(plain, hashValue);
}

export function signJwt<T extends object>(
  payload: T,
  options?: JwtSignOptions
): string {
  const signOptions: SignOptions = {
    expiresIn: options?.expiresIn ?? "7d",
  };
  return jwt.sign(payload, JWT_SECRET, signOptions);
}

export function verifyJwt<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch {
    return null;
  }
}