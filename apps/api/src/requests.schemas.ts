import { z } from "zod";

export const createRequestSchema = z.object({
  unit_id: z.string().uuid().nullable().optional(),
  location_label: z.string().trim().min(1).max(200).nullable().optional(),
  category_id: z.string().uuid(),
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
}).strict();

export const requestListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().min(1).max(500).optional(),
}).strict();

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const requestCursorSchema = z.object({
  created_at: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
}).strict();

export type RequestCursor = z.infer<typeof requestCursorSchema>;
