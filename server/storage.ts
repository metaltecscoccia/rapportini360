import { 
  users,
  clients,
  workTypes,
  materials,
  workOrders,
  dailyReports,
  operations,
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
  type UpdateDailyReport,
  type UpdateOperation
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "./auth";

export interface IStorage {
  // Users
  getAllUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  
  // Clients
  getAllClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  deleteClient(id: string): Promise<boolean>;
  
  // Work Types (Lavorazioni)
  getAllWorkTypes(): Promise<WorkType[]>;
  getWorkType(id: string): Promise<WorkType | undefined>;
  createWorkType(workType: InsertWorkType): Promise<WorkType>;
  updateWorkType(id: string, updates: Partial<InsertWorkType>): Promise<WorkType>;
  deleteWorkType(id: string): Promise<boolean>;
  
  // Materials (Materiali)
  getAllMaterials(): Promise<Material[]>;
  getMaterial(id: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, updates: Partial<InsertMaterial>): Promise<Material>;
  deleteMaterial(id: string): Promise<boolean>;
  
  // Work Orders
  getAllWorkOrders(): Promise<WorkOrder[]>;
  getWorkOrdersByClient(clientId: string): Promise<WorkOrder[]>;
  getWorkOrder(id: string): Promise<WorkOrder | undefined>;
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  updateWorkOrderStatus(id: string, isActive: boolean): Promise<WorkOrder>;
  deleteWorkOrder(id: string): Promise<boolean>;
  
  // Daily Reports
  getAllDailyReports(): Promise<DailyReport[]>;
  getDailyReportsByDate(date: string): Promise<DailyReport[]>;
  getDailyReport(id: string): Promise<DailyReport | undefined>;
  getDailyReportByEmployeeAndDate(employeeId: string, date: string): Promise<DailyReport | undefined>;
  createDailyReport(report: InsertDailyReport): Promise<DailyReport>;
  updateDailyReport(id: string, updates: UpdateDailyReport): Promise<DailyReport>;
  updateDailyReportStatus(id: string, status: string): Promise<DailyReport>;
  deleteDailyReport(id: string): Promise<boolean>;
  
  // Operations
  getOperationsByReportId(reportId: string): Promise<Operation[]>;
  getOperationsByWorkOrderId(workOrderId: string): Promise<Operation[]>;
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
  getWorkOrdersStats(): Promise<Array<{
    workOrderId: string;
    totalOperations: number;
    totalHours: number;
    lastActivity: string | null;
  }>>;
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
      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        plainPassword: null,
        role: "admin",
        fullName: "Amministratore"
      });
    }
  }

  // Users
  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return await db.select().from(users);
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

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureInitialized();
    const hashedPassword = await hashPassword(insertUser.password);
    const role = insertUser.role || "employee";
    
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
      plainPassword: role === 'employee' ? insertUser.password : null,
      role: role
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
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Clients
  async getAllClients(): Promise<Client[]> {
    await this.ensureInitialized();
    return await db.select().from(clients);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    await this.ensureInitialized();
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async deleteClient(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await db.delete(clients).where(eq(clients.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Work Types (Lavorazioni)
  async getAllWorkTypes(): Promise<WorkType[]> {
    await this.ensureInitialized();
    return await db.select().from(workTypes);
  }

  async getWorkType(id: string): Promise<WorkType | undefined> {
    await this.ensureInitialized();
    const [workType] = await db.select().from(workTypes).where(eq(workTypes.id, id));
    return workType || undefined;
  }

  async createWorkType(insertWorkType: InsertWorkType): Promise<WorkType> {
    await this.ensureInitialized();
    const [workType] = await db.insert(workTypes).values(insertWorkType).returning();
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
  async getAllMaterials(): Promise<Material[]> {
    await this.ensureInitialized();
    return await db.select().from(materials);
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    await this.ensureInitialized();
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material || undefined;
  }

  async createMaterial(insertMaterial: InsertMaterial): Promise<Material> {
    await this.ensureInitialized();
    const [material] = await db.insert(materials).values(insertMaterial).returning();
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
  async getAllWorkOrders(): Promise<WorkOrder[]> {
    await this.ensureInitialized();
    return await db.select().from(workOrders);
  }

  async getWorkOrdersByClient(clientId: string): Promise<WorkOrder[]> {
    await this.ensureInitialized();
    return await db.select().from(workOrders).where(eq(workOrders.clientId, clientId));
  }

  async getWorkOrder(id: string): Promise<WorkOrder | undefined> {
    await this.ensureInitialized();
    const [workOrder] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return workOrder || undefined;
  }

  async createWorkOrder(insertWorkOrder: InsertWorkOrder): Promise<WorkOrder> {
    await this.ensureInitialized();
    const [workOrder] = await db.insert(workOrders).values(insertWorkOrder).returning();
    return workOrder;
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
    const result = await db.delete(workOrders).where(eq(workOrders.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Daily Reports
  async getAllDailyReports(): Promise<DailyReport[]> {
    await this.ensureInitialized();
    return await db.select().from(dailyReports);
  }

  async getDailyReportsByDate(date: string): Promise<DailyReport[]> {
    await this.ensureInitialized();
    return await db.select().from(dailyReports).where(eq(dailyReports.date, date));
  }

  async getDailyReport(id: string): Promise<DailyReport | undefined> {
    await this.ensureInitialized();
    const [report] = await db.select().from(dailyReports).where(eq(dailyReports.id, id));
    return report || undefined;
  }

  async getDailyReportByEmployeeAndDate(employeeId: string, date: string): Promise<DailyReport | undefined> {
    await this.ensureInitialized();
    const [report] = await db.select().from(dailyReports).where(
      and(eq(dailyReports.employeeId, employeeId), eq(dailyReports.date, date))
    );
    return report || undefined;
  }

  async createDailyReport(insertReport: InsertDailyReport): Promise<DailyReport> {
    await this.ensureInitialized();
    const [report] = await db.insert(dailyReports).values(insertReport).returning();
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
    const result = await db.delete(dailyReports).where(eq(dailyReports.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Operations
  async getOperationsByReportId(reportId: string): Promise<Operation[]> {
    await this.ensureInitialized();
    return await db.select().from(operations).where(eq(operations.dailyReportId, reportId));
  }

  async getOperationsByWorkOrderId(workOrderId: string): Promise<Operation[]> {
    await this.ensureInitialized();
    return await db.select().from(operations).where(eq(operations.workOrderId, workOrderId));
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

  async getWorkOrdersStats(): Promise<Array<{
    workOrderId: string;
    totalOperations: number;
    totalHours: number;
    lastActivity: string | null;
  }>> {
    await this.ensureInitialized();
    
    const allWorkOrders = await db.select().from(workOrders);
    const allOperations = await db.select().from(operations);
    const allReports = await db.select().from(dailyReports);
    
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
}

export const storage = new DatabaseStorage();
