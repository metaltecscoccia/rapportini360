import { 
  type User, 
  type InsertUser,
  type Client,
  type InsertClient,
  type WorkOrder,
  type InsertWorkOrder,
  type DailyReport,
  type InsertDailyReport,
  type Operation,
  type InsertOperation,
  type UpdateDailyReport,
  type UpdateOperation
} from "@shared/schema";
import { randomUUID } from "crypto";
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
  
  // Work Orders
  getAllWorkOrders(): Promise<WorkOrder[]>;
  getWorkOrdersByClient(clientId: string): Promise<WorkOrder[]>;
  getWorkOrder(id: string): Promise<WorkOrder | undefined>;
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
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
  getOperation(id: string): Promise<Operation | undefined>;
  createOperation(operation: InsertOperation): Promise<Operation>;
  updateOperation(id: string, updates: UpdateOperation): Promise<Operation>;
  deleteOperation(id: string): Promise<boolean>;
  deleteOperationsByReportId(reportId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private clients: Map<string, Client>;
  private workOrders: Map<string, WorkOrder>;
  private dailyReports: Map<string, DailyReport>;
  private operations: Map<string, Operation>;
  private initialized: boolean = false;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.workOrders = new Map();
    this.dailyReports = new Map();
    this.operations = new Map();
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeMockData();
      this.initialized = true;
    }
  }

  private async initializeMockData() {
    // Crea solo l'utente amministratore
    const adminData = { 
      id: "admin1", 
      username: "admin", 
      password: "Metaltec11", 
      fullName: "Amministratore", 
      role: "admin" as const 
    };

    const hashedPassword = await hashPassword(adminData.password);
    const adminUser: User = {
      ...adminData,
      password: hashedPassword,
      plainPassword: null
    };
    this.users.set(adminData.id, adminUser);

    // Database pulito - nessun dipendente, cliente, commessa o rapportino
    // L'amministratore potrà inserire i dati reali dell'azienda
  }

  // Users
  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return Array.from(this.users.values());
  }

  async getUser(id: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInitialized();
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureInitialized();
    const id = randomUUID();
    const hashedPassword = await hashPassword(insertUser.password);
    const role = insertUser.role || "employee";
    const user: User = { 
      ...insertUser, 
      id,
      password: hashedPassword,
      plainPassword: role === 'employee' ? insertUser.password : null,
      role: role
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    await this.ensureInitialized();
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error("Utente non trovato");
    }
    
    // Hash della password se viene aggiornata
    const updatedData = { ...updates };
    if (updates.password) {
      updatedData.password = await hashPassword(updates.password);
      // Se è un dipendente, salva anche la password in chiaro
      if (existingUser.role === 'employee') {
        updatedData.plainPassword = updates.password;
      }
    }
    
    const updatedUser: User = {
      ...existingUser,
      ...updatedData
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.users.delete(id);
  }

  // Clients
  async getAllClients(): Promise<Client[]> {
    await this.ensureInitialized();
    return Array.from(this.clients.values());
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    await this.ensureInitialized();
    const id = randomUUID();
    const client: Client = { ...insertClient, id, description: insertClient.description || null };
    this.clients.set(id, client);
    return client;
  }

  // Work Orders
  async getAllWorkOrders(): Promise<WorkOrder[]> {
    await this.ensureInitialized();
    return Array.from(this.workOrders.values());
  }

  async getWorkOrdersByClient(clientId: string): Promise<WorkOrder[]> {
    await this.ensureInitialized();
    return Array.from(this.workOrders.values()).filter(wo => wo.clientId === clientId);
  }

  async getWorkOrder(id: string): Promise<WorkOrder | undefined> {
    await this.ensureInitialized();
    return this.workOrders.get(id);
  }

  async createWorkOrder(insertWorkOrder: InsertWorkOrder): Promise<WorkOrder> {
    await this.ensureInitialized();
    const id = randomUUID();
    const workOrder: WorkOrder = { 
      ...insertWorkOrder, 
      id, 
      description: insertWorkOrder.description || null,
      isActive: insertWorkOrder.isActive ?? true
    };
    this.workOrders.set(id, workOrder);
    return workOrder;
  }

  async deleteWorkOrder(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.workOrders.delete(id);
  }

  // Daily Reports
  async getAllDailyReports(): Promise<DailyReport[]> {
    await this.ensureInitialized();
    return Array.from(this.dailyReports.values());
  }

  async getDailyReportsByDate(date: string): Promise<DailyReport[]> {
    await this.ensureInitialized();
    return Array.from(this.dailyReports.values()).filter(report => report.date === date);
  }

  async getDailyReport(id: string): Promise<DailyReport | undefined> {
    await this.ensureInitialized();
    return this.dailyReports.get(id);
  }

  async getDailyReportByEmployeeAndDate(employeeId: string, date: string): Promise<DailyReport | undefined> {
    await this.ensureInitialized();
    const reports = Array.from(this.dailyReports.values());
    return reports.find(r => r.employeeId === employeeId && r.date === date);
  }

  async createDailyReport(insertReport: InsertDailyReport): Promise<DailyReport> {
    await this.ensureInitialized();
    const id = randomUUID();
    const report: DailyReport = { 
      ...insertReport, 
      id,
      status: insertReport.status || "In attesa",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.dailyReports.set(id, report);
    return report;
  }

  async updateDailyReport(id: string, updates: UpdateDailyReport): Promise<DailyReport> {
    await this.ensureInitialized();
    const report = this.dailyReports.get(id);
    if (!report) {
      throw new Error("Report not found");
    }
    const updatedReport = { 
      ...report, 
      ...updates, 
      id: report.id, // Keep original id
      updatedAt: new Date() 
    };
    this.dailyReports.set(id, updatedReport);
    return updatedReport;
  }

  async updateDailyReportStatus(id: string, status: string): Promise<DailyReport> {
    await this.ensureInitialized();
    const report = this.dailyReports.get(id);
    if (!report) {
      throw new Error("Report not found");
    }
    const updatedReport = { ...report, status, updatedAt: new Date() };
    this.dailyReports.set(id, updatedReport);
    return updatedReport;
  }

  async deleteDailyReport(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.dailyReports.delete(id);
  }

  // Operations
  async getOperationsByReportId(reportId: string): Promise<Operation[]> {
    await this.ensureInitialized();
    return Array.from(this.operations.values()).filter(op => op.dailyReportId === reportId);
  }

  async getOperationsByWorkOrderId(workOrderId: string): Promise<Operation[]> {
    await this.ensureInitialized();
    return Array.from(this.operations.values()).filter(op => op.workOrderId === workOrderId);
  }

  async getOperation(id: string): Promise<Operation | undefined> {
    await this.ensureInitialized();
    return this.operations.get(id);
  }

  async createOperation(insertOperation: InsertOperation): Promise<Operation> {
    await this.ensureInitialized();
    const id = randomUUID();
    const operation: Operation = { 
      ...insertOperation, 
      id,
      notes: insertOperation.notes || null
    };
    this.operations.set(id, operation);
    return operation;
  }

  async updateOperation(id: string, updates: UpdateOperation): Promise<Operation> {
    await this.ensureInitialized();
    const operation = this.operations.get(id);
    if (!operation) {
      throw new Error("Operation not found");
    }
    const updatedOperation = { 
      ...operation, 
      ...updates, 
      id: operation.id // Keep original id
    };
    this.operations.set(id, updatedOperation);
    return updatedOperation;
  }

  async deleteOperation(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.operations.delete(id);
  }

  async deleteOperationsByReportId(reportId: string): Promise<boolean> {
    await this.ensureInitialized();
    const operations = Array.from(this.operations.values()).filter(op => op.dailyReportId === reportId);
    operations.forEach(op => this.operations.delete(op.id));
    return true;
  }

}

export const storage = new MemStorage();
