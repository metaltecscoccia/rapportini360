import { 
  users,
  clients,
  workTypes,
  materials,
  workOrders,
  dailyReports,
  operations,
  attendanceEntries,
  hoursAdjustments,
  pushSubscriptions,
  vehicles,
  fuelRefills,
  fuelTankLoads,
  type User, 
  type InsertUser,
  type Client,
  type InsertClient,
  type WorkType,
  type InsertWorkType,
  type Material,
  type InsertMaterial,
  type WorkOrder,
  type InsertWorkOrder,
  type DailyReport,
  type InsertDailyReport,
  type Operation,
  type InsertOperation,
  type AttendanceEntry,
  type InsertAttendanceEntry,
  type UpdateAttendanceEntry,
  type HoursAdjustment,
  type InsertHoursAdjustment,
  type UpdateHoursAdjustment,
  type PushSubscription,
  type InsertPushSubscription,
  type Vehicle,
  type InsertVehicle,
  type UpdateVehicle,
  type FuelRefill,
  type InsertFuelRefill,
  type UpdateFuelRefill,
  type FuelTankLoad,
  type InsertFuelTankLoad,
  type UpdateFuelTankLoad,
  type UpdateDailyReport,
  type UpdateOperation
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { hashPassword } from "./auth";

export interface IStorage {
  // Users
  getAllUsers(organizationId: string): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser, organizationId: string): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  
  // Clients
  getAllClients(organizationId: string): Promise<Client[]>;
  createClient(client: InsertClient, organizationId: string): Promise<Client>;
  deleteClient(id: string): Promise<boolean>;
  
  // Work Types (Lavorazioni)
  getAllWorkTypes(organizationId: string): Promise<WorkType[]>;
  getWorkType(id: string): Promise<WorkType | undefined>;
  createWorkType(workType: InsertWorkType, organizationId: string): Promise<WorkType>;
  updateWorkType(id: string, updates: Partial<InsertWorkType>): Promise<WorkType>;
  deleteWorkType(id: string): Promise<boolean>;
  
  // Materials (Materiali)
  getAllMaterials(organizationId: string): Promise<Material[]>;
  getMaterial(id: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial, organizationId: string): Promise<Material>;
  updateMaterial(id: string, updates: Partial<InsertMaterial>): Promise<Material>;
  deleteMaterial(id: string): Promise<boolean>;
  
  // Work Orders
  getAllWorkOrders(organizationId: string): Promise<WorkOrder[]>;
  getWorkOrdersByClient(clientId: string, organizationId: string): Promise<WorkOrder[]>;
  getWorkOrder(id: string, organizationId: string): Promise<WorkOrder | undefined>;
  createWorkOrder(workOrder: InsertWorkOrder, organizationId: string): Promise<WorkOrder>;
  updateWorkOrder(id: string, updates: Partial<InsertWorkOrder>): Promise<WorkOrder>;
  updateWorkOrderStatus(id: string, isActive: boolean): Promise<WorkOrder>;
  deleteWorkOrder(id: string): Promise<boolean>;
  
  // Daily Reports
  getAllDailyReports(organizationId: string): Promise<DailyReport[]>;
  getDailyReportsByDate(date: string, organizationId: string): Promise<DailyReport[]>;
  getDailyReport(id: string): Promise<DailyReport | undefined>;
  getDailyReportByEmployeeAndDate(employeeId: string, date: string, organizationId: string): Promise<DailyReport | undefined>;
  createDailyReport(report: InsertDailyReport, organizationId: string): Promise<DailyReport>;
  updateDailyReport(id: string, updates: UpdateDailyReport): Promise<DailyReport>;
  updateDailyReportStatus(id: string, status: string): Promise<DailyReport>;
  deleteDailyReport(id: string): Promise<boolean>;
  
  // Operations
  getOperationsByReportId(reportId: string): Promise<Operation[]>;
  getOperationsByWorkOrderId(workOrderId: string, organizationId: string): Promise<Operation[]>;
  getOperationsCountByWorkOrderId(workOrderId: string): Promise<number>;
  getOperationsCountByClientId(clientId: string): Promise<number>;
  getOperation(id: string): Promise<Operation | undefined>;
  createOperation(operation: InsertOperation): Promise<Operation>;
  updateOperation(id: string, updates: UpdateOperation): Promise<Operation>;
  deleteOperation(id: string): Promise<boolean>;
  deleteOperationsByReportId(reportId: string): Promise<boolean>;
  deleteOperationsByWorkOrderId(workOrderId: string): Promise<boolean>;
  deleteOperationsByClientId(clientId: string): Promise<boolean>;
  
  // Counts for cascade delete
  getDailyReportsCountByEmployeeId(employeeId: string): Promise<number>;
  getWorkOrdersCountByClientId(clientId: string): Promise<number>;
  deleteDailyReportsByEmployeeId(employeeId: string): Promise<boolean>;
  deleteWorkOrdersByClientId(clientId: string): Promise<boolean>;
  
  // Statistics
  getWorkOrdersStats(organizationId: string): Promise<Array<{
    workOrderId: string;
    totalOperations: number;
    totalHours: number;
    lastActivity: string | null;
  }>>;
  
  // Attendance Entries (Assenze)
  getAllAttendanceEntries(organizationId: string, year: string, month: string): Promise<AttendanceEntry[]>;
  getAttendanceEntry(userId: string, date: string, organizationId: string): Promise<AttendanceEntry | undefined>;
  createAttendanceEntry(entry: InsertAttendanceEntry, organizationId: string): Promise<AttendanceEntry>;
  updateAttendanceEntry(id: string, updates: UpdateAttendanceEntry): Promise<AttendanceEntry>;
  deleteAttendanceEntry(id: string): Promise<boolean>;
  deleteAttendanceEntriesByUserId(userId: string, organizationId: string): Promise<boolean>;
  
  // Hours adjustments
  getHoursAdjustment(dailyReportId: string, organizationId: string): Promise<HoursAdjustment | undefined>;
  createHoursAdjustment(adjustment: InsertHoursAdjustment, organizationId: string, createdBy: string): Promise<HoursAdjustment>;
  updateHoursAdjustment(id: string, updates: UpdateHoursAdjustment): Promise<HoursAdjustment>;
  deleteHoursAdjustment(id: string): Promise<boolean>;
  deleteHoursAdjustmentsByReportId(reportId: string): Promise<boolean>;
  
  // Push Subscriptions
  getPushSubscription(userId: string, organizationId: string): Promise<PushSubscription | undefined>;
  getAllPushSubscriptions(organizationId: string): Promise<PushSubscription[]>;
  createPushSubscription(subscription: InsertPushSubscription, userId: string, organizationId: string): Promise<PushSubscription>;
  deletePushSubscription(userId: string, organizationId: string): Promise<boolean>;
  
  // Vehicles (Mezzi)
  getAllVehicles(organizationId: string): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle, organizationId: string): Promise<Vehicle>;
  updateVehicle(id: string, updates: UpdateVehicle, organizationId: string): Promise<Vehicle>;
  deleteVehicle(id: string, organizationId: string): Promise<boolean>;
  
  // Fuel Refills (Rifornimenti)
  getAllFuelRefills(organizationId: string): Promise<FuelRefill[]>;
  getFuelRefillsByVehicle(vehicleId: string, organizationId: string): Promise<FuelRefill[]>;
  getFuelRefill(id: string): Promise<FuelRefill | undefined>;
  createFuelRefill(refill: InsertFuelRefill, organizationId: string): Promise<FuelRefill>;
  updateFuelRefill(id: string, updates: UpdateFuelRefill, organizationId: string): Promise<FuelRefill>;
  deleteFuelRefill(id: string, organizationId: string): Promise<boolean>;
  deleteFuelRefillsByVehicleId(vehicleId: string): Promise<boolean>;
  
  // Fuel Tank Loads (Carichi cisterna)
  getAllFuelTankLoads(organizationId: string): Promise<FuelTankLoad[]>;
  getFuelTankLoad(id: string): Promise<FuelTankLoad | undefined>;
  createFuelTankLoad(load: InsertFuelTankLoad, organizationId: string): Promise<FuelTankLoad>;
  updateFuelTankLoad(id: string, updates: UpdateFuelTankLoad, organizationId: string): Promise<FuelTankLoad>;
  deleteFuelTankLoad(id: string, organizationId: string): Promise<boolean>;
  getRemainingFuelLiters(organizationId: string): Promise<number>;
  getFuelRefillsStatistics(organizationId: string, year?: string, month?: string): Promise<{
    byVehicle: Array<{
      vehicleId: string;
      vehicleName: string;
      totalLiters: number;
      totalCost: number;
      refillCount: number;
    }>;
    byMonth: Array<{
      month: string;
      year: string;
      totalLiters: number;
      totalCost: number;
      refillCount: number;
    }>;
  }>;
  
  // Monthly Attendance (Foglio Presenze)
  getMonthlyAttendance(organizationId: string, year: string, month: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  private initialized: boolean = false;

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeAdmin();
      this.initialized = true;
    }
  }

  private async initializeAdmin() {
    const existingAdmin = await db.select().from(users).where(eq(users.username, "admin"));
    
    if (existingAdmin.length === 0) {
      const hashedPassword = await hashPassword("Metaltec11");
      // Use default organization ID
      const defaultOrgId = "b578579d-c664-4382-8504-bd7740dbfd9b";
      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        plainPassword: null,
        role: "admin",
        fullName: "Amministratore",
        organizationId: defaultOrgId
      });
    }
  }

  // Users
  async getAllUsers(organizationId: string): Promise<User[]> {
    await this.ensureInitialized();
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  async getUser(id: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser, organizationId: string): Promise<User> {
    await this.ensureInitialized();
    const hashedPassword = await hashPassword(insertUser.password);
    const role = insertUser.role || "employee";
    
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
      plainPassword: role === 'employee' ? insertUser.password : null,
      role: role,
      organizationId
    }).returning();
    
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    await this.ensureInitialized();
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      throw new Error("Utente non trovato");
    }
    
    const updatedData: any = { ...updates };
    if (updates.password) {
      updatedData.password = await hashPassword(updates.password);
      if (existingUser.role === 'employee') {
        updatedData.plainPassword = updates.password;
      }
    }
    
    const [updatedUser] = await db.update(users)
      .set(updatedData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const user = await this.getUser(id);
    if (!user) {
      return false;
    }
    await this.deleteDailyReportsByEmployeeId(id);
    if (user.organizationId) {
      await this.deleteAttendanceEntriesByUserId(id, user.organizationId);
      await this.deletePushSubscription(id, user.organizationId);
    }
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Clients
  async getAllClients(organizationId: string): Promise<Client[]> {
    await this.ensureInitialized();
    return await db.select().from(clients).where(eq(clients.organizationId, organizationId));
  }

  async createClient(insertClient: InsertClient, organizationId: string): Promise<Client> {
    await this.ensureInitialized();
    const [client] = await db.insert(clients).values({
      ...insertClient,
      organizationId
    }).returning();
    return client;
  }

  async deleteClient(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.deleteWorkOrdersByClientId(id);
    const result = await db.delete(clients).where(eq(clients.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Work Types (Lavorazioni)
  async getAllWorkTypes(organizationId: string): Promise<WorkType[]> {
    await this.ensureInitialized();
    return await db.select().from(workTypes).where(eq(workTypes.organizationId, organizationId));
  }

  async getWorkType(id: string): Promise<WorkType | undefined> {
    await this.ensureInitialized();
    const [workType] = await db.select().from(workTypes).where(eq(workTypes.id, id));
    return workType || undefined;
  }

  async createWorkType(insertWorkType: InsertWorkType, organizationId: string): Promise<WorkType> {
    await this.ensureInitialized();
    const [workType] = await db.insert(workTypes).values({
      ...insertWorkType,
      organizationId
    }).returning();
    return workType;
  }

  async updateWorkType(id: string, updates: Partial<InsertWorkType>): Promise<WorkType> {
    await this.ensureInitialized();
    const [updatedWorkType] = await db.update(workTypes)
      .set(updates)
      .where(eq(workTypes.id, id))
      .returning();
    
    if (!updatedWorkType) {
      throw new Error("Lavorazione non trovata");
    }
    
    return updatedWorkType;
  }

  async deleteWorkType(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db.delete(workTypes).where(eq(workTypes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Materials (Materiali)
  async getAllMaterials(organizationId: string): Promise<Material[]> {
    await this.ensureInitialized();
    return await db.select().from(materials).where(eq(materials.organizationId, organizationId));
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    await this.ensureInitialized();
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material || undefined;
  }

  async createMaterial(insertMaterial: InsertMaterial, organizationId: string): Promise<Material> {
    await this.ensureInitialized();
    const [material] = await db.insert(materials).values({
      ...insertMaterial,
      organizationId
    }).returning();
    return material;
  }

  async updateMaterial(id: string, updates: Partial<InsertMaterial>): Promise<Material> {
    await this.ensureInitialized();
    const [updatedMaterial] = await db.update(materials)
      .set(updates)
      .where(eq(materials.id, id))
      .returning();
    
    if (!updatedMaterial) {
      throw new Error("Materiale non trovato");
    }
    
    return updatedMaterial;
  }

  async deleteMaterial(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db.delete(materials).where(eq(materials.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Work Orders
  async getAllWorkOrders(organizationId: string): Promise<WorkOrder[]> {
    await this.ensureInitialized();
    return await db.select().from(workOrders).where(eq(workOrders.organizationId, organizationId));
  }

  async getAllActiveWorkOrders(organizationId: string): Promise<WorkOrder[]> {
    await this.ensureInitialized();
    return await db.select().from(workOrders).where(
      and(eq(workOrders.organizationId, organizationId), eq(workOrders.isActive, true))
    );
  }

  async getWorkOrdersByClient(clientId: string, organizationId: string): Promise<WorkOrder[]> {
    await this.ensureInitialized();
    return await db.select().from(workOrders).where(
      and(eq(workOrders.clientId, clientId), eq(workOrders.organizationId, organizationId))
    );
  }

  async getWorkOrder(id: string, organizationId: string): Promise<WorkOrder | undefined> {
    await this.ensureInitialized();
    const [workOrder] = await db.select().from(workOrders).where(
      and(eq(workOrders.id, id), eq(workOrders.organizationId, organizationId))
    );
    return workOrder || undefined;
  }

  async createWorkOrder(insertWorkOrder: InsertWorkOrder, organizationId: string): Promise<WorkOrder> {
    await this.ensureInitialized();
    const [workOrder] = await db.insert(workOrders).values({
      ...insertWorkOrder,
      organizationId
    }).returning();
    return workOrder;
  }

  async updateWorkOrder(id: string, updates: Partial<InsertWorkOrder>): Promise<WorkOrder> {
    await this.ensureInitialized();
    const [updatedWorkOrder] = await db.update(workOrders)
      .set(updates)
      .where(eq(workOrders.id, id))
      .returning();
    
    if (!updatedWorkOrder) {
      throw new Error("Commessa non trovata");
    }
    
    return updatedWorkOrder;
  }

  async updateWorkOrderStatus(id: string, isActive: boolean): Promise<WorkOrder> {
    await this.ensureInitialized();
    const [updatedWorkOrder] = await db.update(workOrders)
      .set({ isActive })
      .where(eq(workOrders.id, id))
      .returning();
    
    if (!updatedWorkOrder) {
      throw new Error("Commessa non trovata");
    }
    
    return updatedWorkOrder;
  }

  async deleteWorkOrder(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.deleteOperationsByWorkOrderId(id);
    const result = await db.delete(workOrders).where(eq(workOrders.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Daily Reports
  async getAllDailyReports(organizationId: string): Promise<DailyReport[]> {
    await this.ensureInitialized();
    return await db.select().from(dailyReports)
      .where(eq(dailyReports.organizationId, organizationId))
      .orderBy(desc(dailyReports.date));
  }

  async getDailyReportsByDate(date: string, organizationId: string): Promise<DailyReport[]> {
    await this.ensureInitialized();
    return await db.select().from(dailyReports).where(
      and(eq(dailyReports.date, date), eq(dailyReports.organizationId, organizationId))
    );
  }

  async getDailyReport(id: string): Promise<DailyReport | undefined> {
    await this.ensureInitialized();
    const [report] = await db.select().from(dailyReports).where(eq(dailyReports.id, id));
    return report || undefined;
  }

  async getDailyReportByEmployeeAndDate(employeeId: string, date: string, organizationId: string): Promise<DailyReport | undefined> {
    await this.ensureInitialized();
    const [report] = await db.select().from(dailyReports).where(
      and(
        eq(dailyReports.employeeId, employeeId), 
        eq(dailyReports.date, date),
        eq(dailyReports.organizationId, organizationId)
      )
    );
    return report || undefined;
  }

  async createDailyReport(insertReport: InsertDailyReport, organizationId: string): Promise<DailyReport> {
    await this.ensureInitialized();
    const [report] = await db.insert(dailyReports).values({
      ...insertReport,
      organizationId
    }).returning();
    return report;
  }

  async updateDailyReport(id: string, updates: UpdateDailyReport): Promise<DailyReport> {
    await this.ensureInitialized();
    const [updatedReport] = await db.update(dailyReports)
      .set(updates)
      .where(eq(dailyReports.id, id))
      .returning();
    
    if (!updatedReport) {
      throw new Error("Report not found");
    }
    
    return updatedReport;
  }

  async updateDailyReportStatus(id: string, status: string): Promise<DailyReport> {
    await this.ensureInitialized();
    const [updatedReport] = await db.update(dailyReports)
      .set({ status })
      .where(eq(dailyReports.id, id))
      .returning();
    
    if (!updatedReport) {
      throw new Error("Report not found");
    }
    
    return updatedReport;
  }

  async deleteDailyReport(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.deleteOperationsByReportId(id);
    await this.deleteHoursAdjustmentsByReportId(id);
    const result = await db.delete(dailyReports).where(eq(dailyReports.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Operations
  async getOperationsByReportId(reportId: string): Promise<Operation[]> {
    await this.ensureInitialized();
    return await db.select().from(operations).where(eq(operations.dailyReportId, reportId));
  }

  async getOperationsByWorkOrderId(workOrderId: string, organizationId: string): Promise<Operation[]> {
    await this.ensureInitialized();
    // Join with workOrders to ensure organization filtering
    const result = await db.select({ operations })
      .from(operations)
      .innerJoin(workOrders, eq(operations.workOrderId, workOrders.id))
      .where(
        and(
          eq(operations.workOrderId, workOrderId),
          eq(workOrders.organizationId, organizationId)
        )
      );
    return result.map(r => r.operations);
  }

  async getOperation(id: string): Promise<Operation | undefined> {
    await this.ensureInitialized();
    const [operation] = await db.select().from(operations).where(eq(operations.id, id));
    return operation || undefined;
  }

  async createOperation(insertOperation: InsertOperation): Promise<Operation> {
    await this.ensureInitialized();
    const [operation] = await db.insert(operations).values(insertOperation).returning();
    return operation;
  }

  async updateOperation(id: string, updates: UpdateOperation): Promise<Operation> {
    await this.ensureInitialized();
    const [updatedOperation] = await db.update(operations)
      .set(updates)
      .where(eq(operations.id, id))
      .returning();
    
    if (!updatedOperation) {
      throw new Error("Operation not found");
    }
    
    return updatedOperation;
  }

  async deleteOperation(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db.delete(operations).where(eq(operations.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteOperationsByReportId(reportId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db.delete(operations).where(eq(operations.dailyReportId, reportId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getOperationsCountByWorkOrderId(workOrderId: string): Promise<number> {
    await this.ensureInitialized();
    const ops = await db.select().from(operations).where(eq(operations.workOrderId, workOrderId));
    return ops.length;
  }

  async deleteOperationsByWorkOrderId(workOrderId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db.delete(operations).where(eq(operations.workOrderId, workOrderId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getOperationsCountByClientId(clientId: string): Promise<number> {
    await this.ensureInitialized();
    const clientWorkOrders = await db.select().from(workOrders).where(eq(workOrders.clientId, clientId));
    const workOrderIds = clientWorkOrders.map(wo => wo.id);
    
    if (workOrderIds.length === 0) {
      return 0;
    }
    
    const ops = await db.select().from(operations);
    const count = ops.filter(op => workOrderIds.includes(op.workOrderId)).length;
    return count;
  }

  async deleteOperationsByClientId(clientId: string): Promise<boolean> {
    await this.ensureInitialized();
    const clientWorkOrders = await db.select().from(workOrders).where(eq(workOrders.clientId, clientId));
    const workOrderIds = clientWorkOrders.map(wo => wo.id);
    
    if (workOrderIds.length === 0) {
      return true;
    }
    
    let totalDeleted = 0;
    for (const workOrderId of workOrderIds) {
      const result = await db.delete(operations).where(eq(operations.workOrderId, workOrderId));
      if (result.rowCount) totalDeleted += result.rowCount;
    }
    
    return totalDeleted > 0;
  }

  async getDailyReportsCountByEmployeeId(employeeId: string): Promise<number> {
    await this.ensureInitialized();
    const reports = await db.select().from(dailyReports).where(eq(dailyReports.employeeId, employeeId));
    return reports.length;
  }

  async getWorkOrdersCountByClientId(clientId: string): Promise<number> {
    await this.ensureInitialized();
    const orders = await db.select().from(workOrders).where(eq(workOrders.clientId, clientId));
    return orders.length;
  }

  async deleteDailyReportsByEmployeeId(employeeId: string): Promise<boolean> {
    await this.ensureInitialized();
    const employeeReports = await db.select().from(dailyReports).where(eq(dailyReports.employeeId, employeeId));
    
    for (const report of employeeReports) {
      await this.deleteOperationsByReportId(report.id);
      await this.deleteHoursAdjustmentsByReportId(report.id);
    }
    
    const result = await db.delete(dailyReports).where(eq(dailyReports.employeeId, employeeId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteWorkOrdersByClientId(clientId: string): Promise<boolean> {
    await this.ensureInitialized();
    const clientWorkOrders = await db.select().from(workOrders).where(eq(workOrders.clientId, clientId));
    
    for (const workOrder of clientWorkOrders) {
      await this.deleteOperationsByWorkOrderId(workOrder.id);
    }
    
    const result = await db.delete(workOrders).where(eq(workOrders.clientId, clientId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getWorkOrdersStats(organizationId: string): Promise<Array<{
    workOrderId: string;
    totalOperations: number;
    totalHours: number;
    lastActivity: string | null;
  }>> {
    await this.ensureInitialized();
    
    const allWorkOrders = await db.select().from(workOrders).where(eq(workOrders.organizationId, organizationId));
    const allOperations = await db.select().from(operations);
    const allReports = await db.select().from(dailyReports).where(eq(dailyReports.organizationId, organizationId));
    
    const approvedReportIds = new Set(
      allReports.filter(r => r.status === "Approvato").map(r => r.id)
    );
    
    const approvedOperations = allOperations.filter(op => 
      approvedReportIds.has(op.dailyReportId)
    );
    
    const statsMap = new Map<string, {
      totalOperations: number;
      totalHours: number;
      dates: string[];
    }>();
    
    for (const op of approvedOperations) {
      if (!op.workOrderId) continue;
      
      const existing = statsMap.get(op.workOrderId) || {
        totalOperations: 0,
        totalHours: 0,
        dates: []
      };
      
      const report = allReports.find(r => r.id === op.dailyReportId);
      if (report) {
        existing.totalOperations++;
        existing.totalHours += Number(op.hours) || 0;
        existing.dates.push(report.date);
        statsMap.set(op.workOrderId, existing);
      }
    }
    
    return allWorkOrders.map(wo => {
      const stats = statsMap.get(wo.id);
      return {
        workOrderId: wo.id,
        totalOperations: stats?.totalOperations || 0,
        totalHours: stats?.totalHours || 0,
        lastActivity: stats?.dates.length ? 
          stats.dates.sort().reverse()[0] : null
      };
    });
  }

  // Attendance Entries (Assenze)
  async getAllAttendanceEntries(organizationId: string, year: string, month: string): Promise<AttendanceEntry[]> {
    await this.ensureInitialized();
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;
    
    const allEntries = await db.select()
      .from(attendanceEntries)
      .where(eq(attendanceEntries.organizationId, organizationId));
    
    return allEntries.filter(entry => entry.date >= startDate && entry.date <= endDate);
  }

  async getAttendanceEntry(userId: string, date: string, organizationId: string): Promise<AttendanceEntry | undefined> {
    await this.ensureInitialized();
    const entries = await db.select()
      .from(attendanceEntries)
      .where(
        and(
          eq(attendanceEntries.userId, userId),
          eq(attendanceEntries.date, date),
          eq(attendanceEntries.organizationId, organizationId)
        )
      );
    return entries[0];
  }

  async createAttendanceEntry(entry: InsertAttendanceEntry, organizationId: string): Promise<AttendanceEntry> {
    await this.ensureInitialized();
    const result = await db.insert(attendanceEntries).values({
      ...entry,
      organizationId
    }).returning();
    return result[0];
  }

  async updateAttendanceEntry(id: string, updates: UpdateAttendanceEntry): Promise<AttendanceEntry> {
    await this.ensureInitialized();
    const result = await db.update(attendanceEntries)
      .set(updates)
      .where(eq(attendanceEntries.id, id))
      .returning();
    return result[0];
  }

  async deleteAttendanceEntry(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await db.delete(attendanceEntries).where(eq(attendanceEntries.id, id));
    return true;
  }

  async deleteAttendanceEntriesByUserId(userId: string, organizationId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db.delete(attendanceEntries).where(
      and(
        eq(attendanceEntries.userId, userId),
        eq(attendanceEntries.organizationId, organizationId)
      )
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getHoursAdjustment(dailyReportId: string, organizationId: string): Promise<HoursAdjustment | undefined> {
    await this.ensureInitialized();
    const adjustments = await db.select()
      .from(hoursAdjustments)
      .where(
        and(
          eq(hoursAdjustments.dailyReportId, dailyReportId),
          eq(hoursAdjustments.organizationId, organizationId)
        )
      );
    return adjustments[0];
  }

  async createHoursAdjustment(adjustment: InsertHoursAdjustment, organizationId: string, createdBy: string): Promise<HoursAdjustment> {
    await this.ensureInitialized();
    const result = await db.insert(hoursAdjustments).values({
      ...adjustment,
      organizationId,
      createdBy
    }).returning();
    return result[0];
  }

  async updateHoursAdjustment(id: string, updates: UpdateHoursAdjustment): Promise<HoursAdjustment> {
    await this.ensureInitialized();
    const result = await db.update(hoursAdjustments)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(hoursAdjustments.id, id))
      .returning();
    return result[0];
  }

  async deleteHoursAdjustment(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await db.delete(hoursAdjustments).where(eq(hoursAdjustments.id, id));
    return true;
  }

  async deleteHoursAdjustmentsByReportId(reportId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db.delete(hoursAdjustments).where(eq(hoursAdjustments.dailyReportId, reportId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Push Subscriptions
  async getPushSubscription(userId: string, organizationId: string): Promise<PushSubscription | undefined> {
    await this.ensureInitialized();
    const [subscription] = await db.select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.organizationId, organizationId)
        )
      );
    return subscription || undefined;
  }

  async getAllPushSubscriptions(organizationId: string): Promise<PushSubscription[]> {
    await this.ensureInitialized();
    return await db.select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.organizationId, organizationId));
  }

  async createPushSubscription(subscription: InsertPushSubscription, userId: string, organizationId: string): Promise<PushSubscription> {
    await this.ensureInitialized();
    
    // Delete existing subscription for this user if exists
    await db.delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.organizationId, organizationId)
        )
      );
    
    const [created] = await db.insert(pushSubscriptions).values({
      ...subscription,
      userId,
      organizationId,
    }).returning();
    return created;
  }

  async deletePushSubscription(userId: string, organizationId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db.delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.organizationId, organizationId)
        )
      );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Vehicles (Mezzi)
  async getAllVehicles(organizationId: string): Promise<Vehicle[]> {
    await this.ensureInitialized();
    return await db.select().from(vehicles).where(eq(vehicles.organizationId, organizationId));
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    await this.ensureInitialized();
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle || undefined;
  }

  async createVehicle(vehicle: InsertVehicle, organizationId: string): Promise<Vehicle> {
    await this.ensureInitialized();
    const [created] = await db.insert(vehicles).values({
      ...vehicle,
      organizationId
    }).returning();
    return created;
  }

  async updateVehicle(id: string, updates: UpdateVehicle, organizationId: string): Promise<Vehicle> {
    await this.ensureInitialized();
    const [updated] = await db.update(vehicles)
      .set(updates)
      .where(
        and(
          eq(vehicles.id, id),
          eq(vehicles.organizationId, organizationId)
        )
      )
      .returning();
    if (!updated) {
      throw new Error("Vehicle not found or access denied");
    }
    return updated;
  }

  async deleteVehicle(id: string, organizationId: string): Promise<boolean> {
    await this.ensureInitialized();
    // First verify vehicle exists and belongs to the organization
    const [existing] = await db.select().from(vehicles).where(
      and(
        eq(vehicles.id, id),
        eq(vehicles.organizationId, organizationId)
      )
    );
    if (!existing) {
      return false; // Vehicle not found or access denied
    }
    // Now safe to delete fuel refills (we know vehicle belongs to this org)
    await this.deleteFuelRefillsByVehicleId(id);
    // Finally delete the vehicle
    const result = await db.delete(vehicles).where(eq(vehicles.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Fuel Refills (Rifornimenti)
  async getAllFuelRefills(organizationId: string): Promise<FuelRefill[]> {
    await this.ensureInitialized();
    return await db.select()
      .from(fuelRefills)
      .where(eq(fuelRefills.organizationId, organizationId))
      .orderBy(desc(fuelRefills.refillDate));
  }

  async getFuelRefillsByVehicle(vehicleId: string, organizationId: string): Promise<FuelRefill[]> {
    await this.ensureInitialized();
    return await db.select()
      .from(fuelRefills)
      .where(
        and(
          eq(fuelRefills.vehicleId, vehicleId),
          eq(fuelRefills.organizationId, organizationId)
        )
      )
      .orderBy(desc(fuelRefills.refillDate));
  }

  async getFuelRefill(id: string): Promise<FuelRefill | undefined> {
    await this.ensureInitialized();
    const [refill] = await db.select().from(fuelRefills).where(eq(fuelRefills.id, id));
    return refill || undefined;
  }

  async createFuelRefill(refill: InsertFuelRefill, organizationId: string): Promise<FuelRefill> {
    await this.ensureInitialized();
    const [created] = await db.insert(fuelRefills).values({
      ...refill,
      organizationId
    }).returning();
    return created;
  }

  async updateFuelRefill(id: string, updates: UpdateFuelRefill, organizationId: string): Promise<FuelRefill> {
    await this.ensureInitialized();
    const [updated] = await db.update(fuelRefills)
      .set(updates)
      .where(
        and(
          eq(fuelRefills.id, id),
          eq(fuelRefills.organizationId, organizationId)
        )
      )
      .returning();
    if (!updated) {
      throw new Error("Fuel refill not found or access denied");
    }
    return updated;
  }

  async deleteFuelRefill(id: string, organizationId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db.delete(fuelRefills).where(
      and(
        eq(fuelRefills.id, id),
        eq(fuelRefills.organizationId, organizationId)
      )
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteFuelRefillsByVehicleId(vehicleId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db.delete(fuelRefills).where(eq(fuelRefills.vehicleId, vehicleId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Fuel Tank Loads (Carichi cisterna)
  async getAllFuelTankLoads(organizationId: string): Promise<FuelTankLoad[]> {
    await this.ensureInitialized();
    return await db.select()
      .from(fuelTankLoads)
      .where(eq(fuelTankLoads.organizationId, organizationId))
      .orderBy(desc(fuelTankLoads.loadDate));
  }

  async getFuelTankLoad(id: string): Promise<FuelTankLoad | undefined> {
    await this.ensureInitialized();
    const [load] = await db.select().from(fuelTankLoads).where(eq(fuelTankLoads.id, id));
    return load || undefined;
  }

  async createFuelTankLoad(load: InsertFuelTankLoad, organizationId: string): Promise<FuelTankLoad> {
    await this.ensureInitialized();
    const [created] = await db.insert(fuelTankLoads).values({
      ...load,
      organizationId
    }).returning();
    return created;
  }

  async updateFuelTankLoad(id: string, updates: UpdateFuelTankLoad, organizationId: string): Promise<FuelTankLoad> {
    await this.ensureInitialized();
    const [updated] = await db.update(fuelTankLoads)
      .set(updates)
      .where(
        and(
          eq(fuelTankLoads.id, id),
          eq(fuelTankLoads.organizationId, organizationId)
        )
      )
      .returning();
    if (!updated) {
      throw new Error("Fuel tank load not found or access denied");
    }
    return updated;
  }

  async deleteFuelTankLoad(id: string, organizationId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db.delete(fuelTankLoads).where(
      and(
        eq(fuelTankLoads.id, id),
        eq(fuelTankLoads.organizationId, organizationId)
      )
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getRemainingFuelLiters(organizationId: string): Promise<number> {
    await this.ensureInitialized();
    
    // Get all tank loads (carichi)
    const loads = await db.select()
      .from(fuelTankLoads)
      .where(eq(fuelTankLoads.organizationId, organizationId));
    
    const totalLoads = loads.reduce((sum, load) => {
      return sum + parseFloat(load.liters || '0');
    }, 0);
    
    // Get all fuel refills (scarichi)
    const refills = await db.select()
      .from(fuelRefills)
      .where(eq(fuelRefills.organizationId, organizationId));
    
    const totalRefills = refills.reduce((sum, refill) => {
      return sum + parseFloat(refill.litersRefilled || '0');
    }, 0);
    
    return totalLoads - totalRefills;
  }

  async getFuelRefillsStatistics(organizationId: string, year?: string, month?: string) {
    await this.ensureInitialized();
    
    // Get all refills for the organization
    let refills = await db.select()
      .from(fuelRefills)
      .where(eq(fuelRefills.organizationId, organizationId))
      .orderBy(desc(fuelRefills.refillDate));
    
    // Filter by year and month if provided (skip if "all")
    if (year && year !== 'all') {
      refills = refills.filter(r => {
        const refillDate = new Date(r.refillDate);
        return refillDate.getFullYear().toString() === year;
      });
    }
    if (month && month !== 'all') {
      refills = refills.filter(r => {
        const refillDate = new Date(r.refillDate);
        return (refillDate.getMonth() + 1).toString().padStart(2, '0') === month.padStart(2, '0');
      });
    }
    
    // Get all vehicles
    const allVehicles = await db.select()
      .from(vehicles)
      .where(eq(vehicles.organizationId, organizationId));
    
    // Aggregate by vehicle
    const vehicleStats = new Map<string, { totalLiters: number; totalCost: number; refillCount: number; vehicleName: string }>();
    
    for (const refill of refills) {
      const vehicleId = refill.vehicleId;
      const vehicle = allVehicles.find(v => v.id === vehicleId);
      const vehicleName = vehicle ? `${vehicle.name} (${vehicle.licensePlate})` : 'Sconosciuto';
      
      if (!vehicleStats.has(vehicleId)) {
        vehicleStats.set(vehicleId, {
          totalLiters: 0,
          totalCost: 0,
          refillCount: 0,
          vehicleName
        });
      }
      
      const stats = vehicleStats.get(vehicleId)!;
      stats.totalLiters += parseFloat(refill.litersRefilled || '0');
      // Calculate cost from litersRefilled (assuming price per liter can be calculated)
      // For now, we don't have cost data in refills, so we'll set it to 0
      stats.totalCost += 0;
      stats.refillCount += 1;
    }
    
    const byVehicle = Array.from(vehicleStats.entries()).map(([vehicleId, stats]) => ({
      vehicleId,
      vehicleName: stats.vehicleName,
      totalLiters: stats.totalLiters,
      totalCost: stats.totalCost,
      refillCount: stats.refillCount
    }));
    
    // Aggregate by month
    const monthStats = new Map<string, { totalLiters: number; totalCost: number; refillCount: number; year: string }>();
    
    for (const refill of refills) {
      const refillDate = new Date(refill.refillDate);
      const monthKey = refillDate.toISOString().substring(0, 7); // YYYY-MM
      const [yearStr, monthStr] = monthKey.split('-');
      
      if (!monthStats.has(monthKey)) {
        monthStats.set(monthKey, {
          totalLiters: 0,
          totalCost: 0,
          refillCount: 0,
          year: yearStr
        });
      }
      
      const stats = monthStats.get(monthKey)!;
      stats.totalLiters += parseFloat(refill.litersRefilled || '0');
      stats.totalCost += 0;
      stats.refillCount += 1;
    }
    
    const byMonth = Array.from(monthStats.entries())
      .map(([monthKey, stats]) => {
        const [year, month] = monthKey.split('-');
        return {
          month,
          year,
          totalLiters: stats.totalLiters,
          totalCost: stats.totalCost,
          refillCount: stats.refillCount
        };
      })
      .sort((a, b) => `${a.year}-${a.month}`.localeCompare(`${b.year}-${b.month}`));
    
    return {
      byVehicle,
      byMonth
    };
  }

  async getMonthlyAttendance(organizationId: string, year: string, month: string): Promise<any> {
    await this.ensureInitialized();
    
    // Get all employees
    const allUsers = await db.select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.role, 'employee'),
          eq(users.isActive, true)
        )
      );
    
    // Get daily reports for the month
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;
    
    const reports = await db.select()
      .from(dailyReports)
      .where(
        and(
          eq(dailyReports.organizationId, organizationId),
          eq(dailyReports.status, 'Approvato')
        )
      );
    
    const monthReports = reports.filter(r => r.date >= startDate && r.date <= endDate);
    
    // Get all operations for these reports
    const reportIds = monthReports.map(r => r.id);
    const allOperations = await db.select().from(operations);
    const monthOperations = allOperations.filter(op => reportIds.includes(op.dailyReportId));
    
    // Get attendance entries for the month
    const absences = await this.getAllAttendanceEntries(organizationId, year, month);
    
    // Get all hours adjustments for these reports
    const allAdjustments = await db.select().from(hoursAdjustments);
    const monthAdjustments = allAdjustments.filter(adj => reportIds.includes(adj.dailyReportId));
    
    // Build attendance data
    const attendanceData = allUsers.map(user => {
      const userReports = monthReports.filter(r => r.employeeId === user.id);
      const userAbsences = absences.filter(a => a.userId === user.id);
      
      const dailyData: Record<string, { ordinary: number; overtime: number; absence?: string; adjustment?: number }> = {};
      
      // Process daily reports
      userReports.forEach(report => {
        const reportOps = monthOperations.filter(op => op.dailyReportId === report.id);
        let totalHours = reportOps.reduce((sum, op) => sum + Number(op.hours), 0);
        
        // Apply hours adjustment if exists
        const adjustment = monthAdjustments.find(adj => adj.dailyReportId === report.id);
        if (adjustment) {
          const adjustmentValue = Number(adjustment.adjustment);
          totalHours += adjustmentValue;
        }
        
        const ordinary = Math.min(totalHours, 8);
        const overtime = Math.max(totalHours - 8, 0);
        
        dailyData[report.date] = { 
          ordinary, 
          overtime,
          ...(adjustment && { adjustment: Number(adjustment.adjustment) })
        };
      });
      
      // Add absences
      userAbsences.forEach(absence => {
        if (!dailyData[absence.date]) {
          dailyData[absence.date] = { ordinary: 0, overtime: 0 };
        }
        dailyData[absence.date].absence = absence.absenceType;
      });
      
      return {
        userId: user.id,
        fullName: user.fullName,
        dailyData
      };
    });
    
    return attendanceData;
  }
}

export const storage = new DatabaseStorage();
