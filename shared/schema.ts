import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  plainPassword: text("plain_password"), // Only for employees, null for admin
  role: text("role").notNull().default("employee"), // employee or admin
  fullName: text("full_name").notNull(),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
});

// Work orders (Commesse) table
export const workOrders = pgTable("work_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
});

// Daily reports table
export const dailyReports = pgTable("daily_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => users.id),
  date: text("date").notNull(), // YYYY-MM-DD format
  status: text("status").notNull().default("In attesa"), // "In attesa" or "Approvato"
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Operations table (multiple operations per daily report)
export const operations = pgTable("operations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dailyReportId: varchar("daily_report_id").notNull().references(() => dailyReports.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  workTypes: text("work_types").array().notNull(), // Multiple work types: ["Taglio", "Saldatura", "Montaggio"]
  startTime: text("start_time").notNull(), // formato "HH:MM"
  endTime: text("end_time").notNull(), // formato "HH:MM"
  notes: text("notes"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
}).extend({
  // Password validation - no requirements
  password: z.string().min(1, "Password è richiesta"),
  username: z.string().min(3, "Username deve essere di almeno 3 caratteri"),
  fullName: z.string().min(2, "Nome e cognome devono essere di almeno 2 caratteri")
});

// Update user schema for partial updates
export const updateUserSchema = insertUserSchema.partial().extend({
  id: z.string().optional()
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
});

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({
  id: true,
});

export const insertDailyReportSchema = createInsertSchema(dailyReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOperationSchema = createInsertSchema(operations).omit({
  id: true,
});

// Update schemas for editing
export const updateDailyReportSchema = insertDailyReportSchema.partial().extend({
  id: z.string().optional()
});

export const updateOperationSchema = insertOperationSchema.partial().extend({
  id: z.string().optional()
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type WorkOrder = typeof workOrders.$inferSelect;

export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;
export type DailyReport = typeof dailyReports.$inferSelect;

export type InsertOperation = z.infer<typeof insertOperationSchema>;
export type Operation = typeof operations.$inferSelect;

export type UpdateDailyReport = z.infer<typeof updateDailyReportSchema>;
export type UpdateOperation = z.infer<typeof updateOperationSchema>;

export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;

// Work type enum
export const WorkTypeEnum = z.enum(["Taglio", "Saldatura", "Montaggio", "Foratura", "Verniciatura", "Stuccatura", "Manutenzione", "Generico"]);
export type WorkType = z.infer<typeof WorkTypeEnum>;

// Status enum
export const StatusEnum = z.enum(["In attesa", "Approvato"]);
export type Status = z.infer<typeof StatusEnum>;

// Attendance status enum  
export const AttendanceStatusEnum = z.enum(["Presente", "Ferie", "Assente", "Permesso"]);
export type AttendanceStatus = z.infer<typeof AttendanceStatusEnum>;

// Attendance records table
export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => users.id),
  date: text("date").notNull(), // YYYY-MM-DD format
  status: text("status").notNull(), // "Ferie", "Assente", "Permesso"
  notes: text("notes"), // Optional notes
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Unique constraint for employee + date
// Note: In actual DB, this would be a unique constraint

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
