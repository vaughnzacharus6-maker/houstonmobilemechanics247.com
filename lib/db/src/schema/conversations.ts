import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const conversationThreadsTable = pgTable("conversation_threads", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversationMessagesTable = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull(),
  senderRole: text("sender_role").notNull(),
  authorTechnicianId: integer("author_technician_id"),
  authorClerkUserId: text("author_clerk_user_id"),
  body: text("body").notNull(),
  deliveryStatus: text("delivery_status").notNull().default("sent"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConversationThreadSchema = createInsertSchema(conversationThreadsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationMessageSchema = createInsertSchema(conversationMessagesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertConversationThread = z.infer<typeof insertConversationThreadSchema>;
export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;
export type ConversationThread = typeof conversationThreadsTable.$inferSelect;
export type ConversationMessage = typeof conversationMessagesTable.$inferSelect;