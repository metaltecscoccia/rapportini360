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
  type UpdateOperation,
  type AttendanceRecord,
  type InsertAttendanceRecord,
  type AttendanceStatus
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
  getWorkOrdersByClient(clientId: string): Promise<WorkOrder[]>;
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  
  // Daily Reports
  getAllDailyReports(): Promise<DailyReport[]>;
  getDailyReportsByDate(date: string): Promise<DailyReport[]>;
  getDailyReport(id: string): Promise<DailyReport | undefined>;
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
  
  // Attendance Records
  getAttendanceRecordsByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]>;
  getAttendanceRecord(employeeId: string, date: string): Promise<AttendanceRecord | undefined>;
  upsertAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord>;
  deleteAttendanceRecord(employeeId: string, date: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private clients: Map<string, Client>;
  private workOrders: Map<string, WorkOrder>;
  private dailyReports: Map<string, DailyReport>;
  private operations: Map<string, Operation>;
  private attendanceRecords: Map<string, AttendanceRecord>; // key: employeeId-date
  private initialized: boolean = false;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.workOrders = new Map();
    this.dailyReports = new Map();
    this.operations = new Map();
    this.attendanceRecords = new Map();
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeMockData();
      this.initialized = true;
    }
  }

  private async initializeMockData() {
    // Mock employees - hash passwords for security with strong passwords
    const mockUsers = [
      { id: "emp1", username: "marco.rossi", password: "SecurePass123", fullName: "Marco Rossi", role: "employee" as const },
      { id: "emp2", username: "laura.bianchi", password: "SecurePass456", fullName: "Laura Bianchi", role: "employee" as const },
      { id: "emp3", username: "giuseppe.verde", password: "SecurePass789", fullName: "Giuseppe Verde", role: "employee" as const },
      { id: "emp4", username: "anna.neri", password: "SecurePass321", fullName: "Anna Neri", role: "employee" as const },
      { id: "admin1", username: "admin", password: "Metaltec11", fullName: "Amministratore", role: "admin" as const }
    ];

    // Hash passwords for all mock users
    for (const userData of mockUsers) {
      const hashedPassword = await hashPassword(userData.password);
      const user: User = {
        ...userData,
        password: hashedPassword,
        plainPassword: userData.role === 'employee' ? userData.password : null
      };
      this.users.set(userData.id, user);
    }

    // Mock clients
    const client1: Client = { id: "1", name: "Acme Corporation", description: null };
    const client2: Client = { id: "2", name: "TechFlow Solutions", description: null };
    const client3: Client = { id: "3", name: "Industrial Works", description: null };
    
    this.clients.set("1", client1);
    this.clients.set("2", client2);
    this.clients.set("3", client3);
    
    // Mock work orders
    const workOrders = [
      { id: "1", clientId: "1", name: "Progetto Alpha", description: null, isActive: true },
      { id: "2", clientId: "1", name: "Manutenzione Impianti", description: null, isActive: true },
      { id: "3", clientId: "2", name: "Sistema Automazione", description: null, isActive: true },
      { id: "4", clientId: "2", name: "Controllo Qualità", description: null, isActive: true },
      { id: "5", clientId: "3", name: "Linea Produzione A", description: null, isActive: true },
      { id: "6", clientId: "3", name: "Retrofit Macchinari", description: null, isActive: true },
    ];
    
    workOrders.forEach(wo => this.workOrders.set(wo.id, wo));
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
  async getWorkOrdersByClient(clientId: string): Promise<WorkOrder[]> {
    await this.ensureInitialized();
    return Array.from(this.workOrders.values()).filter(wo => wo.clientId === clientId);
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

  // Attendance Records
  async getAttendanceRecordsByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    await this.ensureInitialized();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return Array.from(this.attendanceRecords.values()).filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= start && recordDate <= end;
    });
  }

  async getAttendanceRecord(employeeId: string, date: string): Promise<AttendanceRecord | undefined> {
    await this.ensureInitialized();
    const key = `${employeeId}-${date}`;
    return this.attendanceRecords.get(key);
  }

  async upsertAttendanceRecord(insertRecord: InsertAttendanceRecord): Promise<AttendanceRecord> {
    await this.ensureInitialized();
    const key = `${insertRecord.employeeId}-${insertRecord.date}`;
    const existing = this.attendanceRecords.get(key);
    
    const record: AttendanceRecord = {
      id: existing?.id || randomUUID(),
      ...insertRecord,
      notes: insertRecord.notes || null,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    this.attendanceRecords.set(key, record);
    return record;
  }

  async deleteAttendanceRecord(employeeId: string, date: string): Promise<boolean> {
    await this.ensureInitialized();
    const key = `${employeeId}-${date}`;
    return this.attendanceRecords.delete(key);
  }
}

export const storage = new MemStorage();
