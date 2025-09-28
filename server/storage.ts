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
  type AttendanceRecord,
  type InsertAttendanceRecord,
  type AttendanceStatus
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getAllUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Clients
  getAllClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  
  // Work Orders
  getWorkOrdersByClient(clientId: string): Promise<WorkOrder[]>;
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  
  // Daily Reports
  getAllDailyReports(): Promise<DailyReport[]>;
  getDailyReportsByDate(date: string): Promise<DailyReport[]>;
  createDailyReport(report: InsertDailyReport): Promise<DailyReport>;
  updateDailyReportStatus(id: string, status: string): Promise<DailyReport>;
  
  // Operations
  getOperationsByReportId(reportId: string): Promise<Operation[]>;
  createOperation(operation: InsertOperation): Promise<Operation>;
  
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

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.workOrders = new Map();
    this.dailyReports = new Map();
    this.operations = new Map();
    this.attendanceRecords = new Map();
    
    // Initialize with mock data
    this.initializeMockData();
  }

  private async initializeMockData() {
    // Mock employees  
    const employee1: User = { id: "emp1", username: "A", fullName: "Marco Rossi", role: "employee" };
    const employee2: User = { id: "emp2", username: "B", fullName: "Laura Bianchi", role: "employee" };
    const employee3: User = { id: "emp3", username: "C", fullName: "Giuseppe Verde", role: "employee" };
    const employee4: User = { id: "emp4", username: "D", fullName: "Anna Neri", role: "employee" };
    
    this.users.set("emp1", employee1);
    this.users.set("emp2", employee2);
    this.users.set("emp3", employee3);
    this.users.set("emp4", employee4);

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
    return Array.from(this.users.values());
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || "employee"
    };
    this.users.set(id, user);
    return user;
  }

  // Clients
  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = { ...insertClient, id };
    this.clients.set(id, client);
    return client;
  }

  // Work Orders
  async getWorkOrdersByClient(clientId: string): Promise<WorkOrder[]> {
    return Array.from(this.workOrders.values()).filter(wo => wo.clientId === clientId);
  }

  async createWorkOrder(insertWorkOrder: InsertWorkOrder): Promise<WorkOrder> {
    const id = randomUUID();
    const workOrder: WorkOrder = { ...insertWorkOrder, id };
    this.workOrders.set(id, workOrder);
    return workOrder;
  }

  // Daily Reports
  async getAllDailyReports(): Promise<DailyReport[]> {
    return Array.from(this.dailyReports.values());
  }

  async getDailyReportsByDate(date: string): Promise<DailyReport[]> {
    return Array.from(this.dailyReports.values()).filter(report => report.date === date);
  }

  async createDailyReport(insertReport: InsertDailyReport): Promise<DailyReport> {
    const id = randomUUID();
    const report: DailyReport = { 
      ...insertReport, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.dailyReports.set(id, report);
    return report;
  }

  async updateDailyReportStatus(id: string, status: string): Promise<DailyReport> {
    const report = this.dailyReports.get(id);
    if (!report) {
      throw new Error("Report not found");
    }
    const updatedReport = { ...report, status, updatedAt: new Date() };
    this.dailyReports.set(id, updatedReport);
    return updatedReport;
  }

  // Operations
  async getOperationsByReportId(reportId: string): Promise<Operation[]> {
    return Array.from(this.operations.values()).filter(op => op.dailyReportId === reportId);
  }

  async createOperation(insertOperation: InsertOperation): Promise<Operation> {
    const id = randomUUID();
    const operation: Operation = { ...insertOperation, id };
    this.operations.set(id, operation);
    return operation;
  }

  // Attendance Records
  async getAttendanceRecordsByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return Array.from(this.attendanceRecords.values()).filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= start && recordDate <= end;
    });
  }

  async getAttendanceRecord(employeeId: string, date: string): Promise<AttendanceRecord | undefined> {
    const key = `${employeeId}-${date}`;
    return this.attendanceRecords.get(key);
  }

  async upsertAttendanceRecord(insertRecord: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const key = `${insertRecord.employeeId}-${insertRecord.date}`;
    const existing = this.attendanceRecords.get(key);
    
    const record: AttendanceRecord = {
      id: existing?.id || randomUUID(),
      ...insertRecord,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    this.attendanceRecords.set(key, record);
    return record;
  }

  async deleteAttendanceRecord(employeeId: string, date: string): Promise<boolean> {
    const key = `${employeeId}-${date}`;
    return this.attendanceRecords.delete(key);
  }
}

export const storage = new MemStorage();
