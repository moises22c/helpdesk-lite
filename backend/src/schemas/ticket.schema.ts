import { z } from "zod";

export const createTicketSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  category: z.string().min(2),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export const addCommentSchema = z.object({
  body: z.string().min(1),
});

export const updateStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export const assignSchema = z.object({
  assignedToId: z.string().nullable(),
});
