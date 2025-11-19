import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organizations table (Aziende/Clienti SaaS)
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  subdomain: text("subdomain").unique(), // es: "azienda1" per azienda1.tuaapp.com
  logo: text("logo"), // URL del logo aziendale
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id),
  username: text("username").notNull(),
  password: text("password").notNull(),
  plainPassword: text("plain_password"), // Only for employees, null for admin
  role: text("role").notNull().default("employee"), // employee, admin, or superadmin
  fullName: text("full_name").notNull(),
  isActive: boolean("is_active").notNull().default(true), // true = attivo, false = licenziato
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
});

// Work types master table (Lavorazioni)
export const workTypes = pgTable("work_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
});

// Materials master table (Materiali)
export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
});

// Work orders (Commesse) table
export const workOrders = pgTable("work_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  availableWorkTypes: text("available_work_types").array().notNull().default(sql`ARRAY[]::text[]`),
  availableMaterials: text("available_materials").array().notNull().default(sql`ARRAY[]::text[]`),
}, (table) => ({
  orgActiveIdx: index("work_orders_org_active_idx").on(table.organizationId, table.isActive),
  clientIdx: index("work_orders_client_idx").on(table.clientId),
}));

// Daily reports table
export const dailyReports = pgTable("daily_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  employeeId: varchar("employee_id").notNull().references(() => users.id),
  date: text("date").notNull(), // YYYY-MM-DD format
  status: text("status").notNull().default("In attesa"), // "In attesa" or "Approvato"
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  orgDateIdx: index("daily_reports_org_date_idx").on(table.organizationId, table.date),
  employeeDateIdx: index("daily_reports_employee_date_idx").on(table.employeeId, table.date),
}));

// Operations table (multiple operations per daily report)
export const operations = pgTable("operations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dailyReportId: varchar("daily_report_id").notNull().references(() => dailyReports.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  workOrderId: varchar("work_order_id").notNull().references(() => workOrders.id),
  workTypes: text("work_types").array().notNull(), // Multiple work types: ["Taglio", "Saldatura", "Montaggio"]
  materials: text("materials").array().notNull().default(sql`ARRAY[]::text[]`), // Multiple materials: ["Acciaio", "Alluminio"]
  hours: numeric("hours").notNull(), // Ore lavorate per questa operazione (es. 2.5)
  notes: text("notes"),
  photos: text("photos").array().notNull().default(sql`ARRAY[]::text[]`), // Photo paths from object storage (max 5)
}, (table) => ({
  dailyReportIdx: index("operations_daily_report_idx").on(table.dailyReportId),
}));

// Attendance entries (Assenze manuali gestite dall'admin)
export const attendanceEntries = pgTable("attendance_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: text("date").notNull(), // YYYY-MM-DD format
  absenceType: text("absence_type").notNull(), // A, F, P, M, CP, L104
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Hours adjustments (Aggiustamenti ore per rapportini)
export const hoursAdjustments = pgTable("hours_adjustments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  dailyReportId: varchar("daily_report_id").notNull().references(() => dailyReports.id),
  adjustment: numeric("adjustment").notNull(), // Valore positivo o negativo (es. +0.5 o -1.5)
  reason: text("reason"), // Motivo opzionale dell'aggiustamento
  createdBy: varchar("created_by").notNull().references(() => users.id), // Admin che ha creato l'aggiustamento
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Vehicles table (Mezzi aziendali per gestione carburante)
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(), // Nome del mezzo (es. "Furgone 1", "Camion rosso")
  licensePlate: text("license_plate").notNull(), // Targa
  fuelType: text("fuel_type").notNull(), // Benzina, Diesel, GPL, Metano, Elettrico
  currentKm: numeric("current_km"), // Km attuali (opzionale)
  currentEngineHours: numeric("current_engine_hours"), // Ore motore attuali (opzionale, per mezzi da lavoro)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => ({
  orgIdx: index("vehicles_org_idx").on(table.organizationId),
}));

// Fuel refills table (Rifornimenti carburante - scarichi dalla cisterna)
export const fuelRefills = pgTable("fuel_refills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id),
  refillDate: timestamp("refill_date").notNull().default(sql`now()`), // Data e ora rifornimento
  operatorId: varchar("operator_id").references(() => users.id), // Chi ha fatto il rifornimento (opzionale)
  litersBefore: numeric("liters_before").notNull(), // Litri nel serbatoio prima del rifornimento
  litersAfter: numeric("liters_after").notNull(), // Litri nel serbatoio dopo il rifornimento
  litersRefilled: numeric("liters_refilled").notNull(), // Litri erogati (after - before)
  kmReading: numeric("km_reading"), // Lettura km al momento del rifornimento
  engineHoursReading: numeric("engine_hours_reading"), // Lettura ore motore (opzionale)
  totalCost: numeric("total_cost"), // Costo totale rifornimento (opzionale)
  notes: text("notes"), // Note aggiuntive
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => ({
  vehicleIdx: index("fuel_refills_vehicle_idx").on(table.vehicleId),
  orgDateIdx: index("fuel_refills_org_date_idx").on(table.organizationId, table.refillDate),
}));

// Fuel tank loads table (Carichi cisterna carburante)
export const fuelTankLoads = pgTable("fuel_tank_loads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  loadDate: timestamp("load_date").notNull().default(sql`now()`), // Data e ora carico
  liters: numeric("liters").notNull(), // Litri caricati nella cisterna
  totalCost: numeric("total_cost"), // Costo totale del carico (opzionale)
  supplier: text("supplier"), // Fornitore (opzionale)
  notes: text("notes"), // Note aggiuntive
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => ({
  orgDateIdx: index("fuel_tank_loads_org_date_idx").on(table.organizationId, table.loadDate),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  organizationId: true, // Will be set automatically from session
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
  organizationId: true, // Will be set automatically from session
});

export const insertWorkTypeSchema = createInsertSchema(workTypes).omit({
  id: true,
  organizationId: true, // Will be set automatically from session
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  organizationId: true, // Will be set automatically from session
});

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({
  id: true,
  organizationId: true, // Will be set automatically from session
});

export const insertDailyReportSchema = createInsertSchema(dailyReports).omit({
  id: true,
  organizationId: true, // Will be set automatically from session
  createdAt: true,
  updatedAt: true,
});

export const insertOperationSchema = createInsertSchema(operations).omit({
  id: true,
}).extend({
  hours: z.union([z.string(), z.number()]).transform(val => String(val))
});

export const insertAttendanceEntrySchema = createInsertSchema(attendanceEntries).omit({
  id: true,
  organizationId: true, // Will be set automatically from session
  createdAt: true,
}).extend({
  absenceType: z.string().min(1, "Tipo assenza richiesto")
});

export const insertHoursAdjustmentSchema = createInsertSchema(hoursAdjustments).omit({
  id: true,
  organizationId: true, // Will be set automatically from session
  createdBy: true, // Will be set automatically from session
  createdAt: true,
  updatedAt: true,
}).extend({
  adjustment: z.union([z.string(), z.number()]).transform(val => String(val))
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  organizationId: true, // Will be set automatically from session
  createdAt: true,
}).extend({
  currentKm: z.union([z.string(), z.number(), z.null()]).optional().transform(val => val ? String(val) : null),
  currentEngineHours: z.union([z.string(), z.number(), z.null()]).optional().transform(val => val ? String(val) : null),
});

export const insertFuelRefillSchema = createInsertSchema(fuelRefills).omit({
  id: true,
  organizationId: true, // Will be set automatically from session
  createdAt: true,
}).extend({
  litersBefore: z.union([z.string(), z.number()]).transform(val => String(val)),
  litersAfter: z.union([z.string(), z.number()]).transform(val => String(val)),
  litersRefilled: z.union([z.string(), z.number()]).transform(val => String(val)),
  kmReading: z.union([z.string(), z.number(), z.null()]).optional().transform(val => val ? String(val) : null),
  engineHoursReading: z.union([z.string(), z.number(), z.null()]).optional().transform(val => val ? String(val) : null),
  totalCost: z.union([z.string(), z.number(), z.null()]).optional().transform(val => val ? String(val) : null),
});

export const insertFuelTankLoadSchema = createInsertSchema(fuelTankLoads).omit({
  id: true,
  organizationId: true, // Will be set automatically from session
  createdAt: true,
}).extend({
  liters: z.union([z.string(), z.number()]).transform(val => String(val)),
  totalCost: z.union([z.string(), z.number(), z.null()]).optional().transform(val => val ? String(val) : null),
});

// Update schemas for editing
export const updateDailyReportSchema = insertDailyReportSchema.partial().extend({
  id: z.string().optional()
});

export const updateOperationSchema = insertOperationSchema.partial().extend({
  id: z.string().optional()
});

export const updateAttendanceEntrySchema = insertAttendanceEntrySchema.partial().extend({
  id: z.string().optional(),
  absenceType: z.enum(["A", "F", "P", "M", "CP", "L104"]).optional()
});

export const updateHoursAdjustmentSchema = insertHoursAdjustmentSchema.partial().extend({
  id: z.string().optional()
});

export const updateVehicleSchema = insertVehicleSchema.partial().extend({
  id: z.string().optional()
});

export const updateFuelRefillSchema = insertFuelRefillSchema.partial().extend({
  id: z.string().optional()
});

export const updateFuelTankLoadSchema = insertFuelTankLoadSchema.partial().extend({
  id: z.string().optional()
});

// Types
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertWorkType = z.infer<typeof insertWorkTypeSchema>;
export type WorkType = typeof workTypes.$inferSelect;

export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materials.$inferSelect;

export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type WorkOrder = typeof workOrders.$inferSelect;

export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;
export type DailyReport = typeof dailyReports.$inferSelect;

export type InsertOperation = z.infer<typeof insertOperationSchema>;
export type Operation = typeof operations.$inferSelect;

export type InsertAttendanceEntry = z.infer<typeof insertAttendanceEntrySchema>;
export type AttendanceEntry = typeof attendanceEntries.$inferSelect;
export type UpdateAttendanceEntry = z.infer<typeof updateAttendanceEntrySchema>;

export type InsertHoursAdjustment = z.infer<typeof insertHoursAdjustmentSchema>;
export type HoursAdjustment = typeof hoursAdjustments.$inferSelect;
export type UpdateHoursAdjustment = z.infer<typeof updateHoursAdjustmentSchema>;

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type UpdateVehicle = z.infer<typeof updateVehicleSchema>;

export type InsertFuelRefill = z.infer<typeof insertFuelRefillSchema>;
export type FuelRefill = typeof fuelRefills.$inferSelect;
export type UpdateFuelRefill = z.infer<typeof updateFuelRefillSchema>;

export type InsertFuelTankLoad = z.infer<typeof insertFuelTankLoadSchema>;
export type FuelTankLoad = typeof fuelTankLoads.$inferSelect;
export type UpdateFuelTankLoad = z.infer<typeof updateFuelTankLoadSchema>;

export type UpdateDailyReport = z.infer<typeof updateDailyReportSchema>;
export type UpdateOperation = z.infer<typeof updateOperationSchema>;

// Status enum
export const StatusEnum = z.enum(["In attesa", "Approvato"]);
export type Status = z.infer<typeof StatusEnum>;

// Absence type enum - AGGIORNATO CON "A"
export const AbsenceTypeEnum = z.enum(["A", "F", "P", "M", "CP", "L104"]);
export type AbsenceType = z.infer<typeof AbsenceTypeEnum>;