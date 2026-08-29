import { z } from "zod";

export const nonEmptyStringSchema = z.string().trim().min(1);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email());

export const objectIdStringSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Expected a MongoDB ObjectId string.");

export const sha256HexSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f\d]{64}$/i, "Expected a SHA-256 hex digest.");

export const positiveIntegerSchema = z.number().int().positive();

export const documentNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(255);

export const pdfMimeTypeSchema = z.literal("application/pdf");
