import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WordService } from "./wordService";
import { generateAttendanceExcel } from "./excelService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission, ObjectAccessGroupType } from "./objectAcl";
import { getTodayISO } from "@shared/dateUtils";
import { 
  insertUserSchema,
  updateUserSchema,
  insertDailyReportSchema,
  updateDailyReportSchema,
  insertOperationSchema,
  updateOperationSchema,
  insertClientSchema,
  insertWorkTypeSchema,
  insertMaterialSchema,
  insertWorkOrderSchema,
  insertAttendanceEntrySchema,
  updateAttendanceEntrySchema,
  insertHoursAdjustmentSchema,
  updateHoursAdjustmentSchema
} from "@shared/schema";
import { validatePassword, verifyPassword, hashPassword } from "./auth";

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Autenticazione richiesta" });
  }
  next();
};

// Admin authorization middleware  
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Autenticazione richiesta" });
  }
  if (req.session.userRole !== "admin") {
    return res.status(403).json({ error: "Accesso riservato agli amministratori" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const wordService = new WordService();

  // Get current user info
  app.get("/api/me", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get all users (admin only)
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const organizationId = (req as any).session.organizationId;
      const users = await storage.getAllUsers(organizationId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Create new user (admin only)
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      console.log("POST /api/users - Request body:", JSON.stringify(req.body, null, 2));
      console.log("Session info:", { userId: (req as any).session.userId, userRole: (req as any).session.userRole });
      
      const result = insertUserSchema.safeParse(req.body);
      
      if (!result.success) {
        console.error("User validation failed:", result.error.issues);
        return res.status(400).json({ error: "Invalid user data", issues: result.error.issues });
      }
      
      console.log("User validation passed, checking for existing username...");
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(result.data.username);
      if (existingUser) {
        console.log("Username already exists:", result.data.username);
        return res.status(400).json({ error: "Username già esistente" });
      }
      
      console.log("Creating user...");
      const organizationId = (req as any).session.organizationId;
      const user = await storage.createUser(result.data, organizationId);
      console.log("User created successfully:", user.id);
      
      res.json(user);
    } catch (error: any) {
      console.error("Error creating user:", error);
      console.error("Error stack:", error?.stack);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Update user (admin only)
  app.put("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = updateUserSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: "Invalid user data", issues: result.error.issues });
      }
      
      // Check if user exists
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "Utente non trovato" });
      }
      
      // No password validation - admin can set any password
      
      // If updating username, check it doesn't exist
      if (result.data.username && result.data.username !== existingUser.username) {
        const existingUserWithUsername = await storage.getUserByUsername(result.data.username);
        if (existingUserWithUsername) {
          return res.status(400).json({ error: "Username già esistente" });
        }
      }
      
      const updatedUser = await storage.updateUser(id, result.data);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Get daily reports count for a user (admin only)
  app.get("/api/users/:id/daily-reports/count", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const count = await storage.getDailyReportsCountByEmployeeId(id);
      res.json({ count });
    } catch (error) {
      console.error("Error counting daily reports:", error);
      res.status(500).json({ error: "Failed to count daily reports" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "Utente non trovato" });
      }
      
      // Prevent deletion of admin users (optional security measure)
      if (existingUser.role === "admin") {
        return res.status(403).json({ error: "Non è possibile eliminare utenti amministratori" });
      }
      
      // Delete all daily reports (and their operations) for this employee
      await storage.deleteDailyReportsByEmployeeId(id);
      
      // Delete the user
      const deleted = await storage.deleteUser(id);
      
      if (deleted) {
        res.json({ success: true, message: "Utente eliminato con successo" });
      } else {
        res.status(500).json({ error: "Failed to delete user" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Login route
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: "Username è richiesto" });
      }
      
      // Get user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Credenziali non valide" });
      }
      
      // Admin can login without password (temporary)
      if (user.username === 'admin') {
        // Admin access without password verification
        (req as any).session.userId = user.id;
        (req as any).session.userRole = user.role;
        (req as any).session.organizationId = user.organizationId;
        
        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;
        return res.json({ 
          success: true, 
          user: userWithoutPassword 
        });
      }
      
      // For non-admin users, password is required
      if (!password) {
        return res.status(400).json({ error: "Password è richiesta" });
      }
      
      // Verify password for non-admin users
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Credenziali non valide" });
      }
      
      // Create session
      (req as any).session.userId = user.id;
      (req as any).session.userRole = user.role;
      (req as any).session.organizationId = user.organizationId;
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        success: true, 
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Reset user password (admin only) - admin chooses the password
  app.post("/api/users/:id/reset-password", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      
      // Validate new password - only check if not empty
      if (!newPassword || newPassword.trim().length === 0) {
        return res.status(400).json({ error: "Password non può essere vuota" });
      }
      
      // Check if user exists
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "Utente non trovato" });
      }
      
      // Prevent reset of admin password (security measure)
      if (existingUser.role === "admin") {
        return res.status(403).json({ error: "Non è possibile resettare la password dell'amministratore" });
      }
      
      // Update user password with admin-chosen password (storage will handle hashing)
      const updatedUser = await storage.updateUser(id, { password: newPassword.trim() });
      
      // TODO: Invalidate all existing sessions for this user for security
      // This would require a session store that supports selective session invalidation
      
      res.json({ 
        success: true, 
        message: "Password aggiornata con successo.",
        username: existingUser.username,
        fullName: existingUser.fullName
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Logout route
  app.post("/api/logout", (req: any, res: any) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Errore durante il logout" });
      }
      res.json({ success: true, message: "Logout effettuato con successo" });
    });
  });

  // Get all clients
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const organizationId = (req as any).session.organizationId;
      const clients = await storage.getAllClients(organizationId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // Create new client (admin only)
  app.post("/api/clients", requireAdmin, async (req, res) => {
    try {
      const result = insertClientSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: "Dati cliente non validi", issues: result.error.issues });
      }
      
      const organizationId = (req as any).session.organizationId;
      const client = await storage.createClient(result.data, organizationId);
      res.status(201).json(client);
    } catch (error: any) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  // Get work orders count for a client (admin only)
  app.get("/api/clients/:id/work-orders/count", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const count = await storage.getWorkOrdersCountByClientId(id);
      res.json({ count });
    } catch (error) {
      console.error("Error counting work orders:", error);
      res.status(500).json({ error: "Failed to count work orders" });
    }
  });

  // Get operations count for a client (admin only)
  app.get("/api/clients/:id/operations/count", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const count = await storage.getOperationsCountByClientId(id);
      res.json({ count });
    } catch (error) {
      console.error("Error counting operations:", error);
      res.status(500).json({ error: "Failed to count operations" });
    }
  });

  // Delete client (admin only) - cascading delete of work orders and operations
  app.delete("/api/clients/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // First delete all operations for this client's work orders
      await storage.deleteOperationsByClientId(id);
      
      // Then delete all work orders for this client
      await storage.deleteWorkOrdersByClientId(id);
      
      // Finally delete the client
      const deleted = await storage.deleteClient(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Cliente non trovato" });
      }
      
      res.json({ success: true, message: "Cliente eliminato con successo" });
    } catch (error: any) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: error.message || "Failed to delete client" });
    }
  });

  // Work Types (Lavorazioni) - Master list management
  app.get("/api/work-types", requireAuth, async (req, res) => {
    try {
      const organizationId = (req as any).session.organizationId;
      const workTypes = await storage.getAllWorkTypes(organizationId);
      res.json(workTypes);
    } catch (error) {
      console.error("Error fetching work types:", error);
      res.status(500).json({ error: "Failed to fetch work types" });
    }
  });

  app.post("/api/work-types", requireAdmin, async (req, res) => {
    try {
      const result = insertWorkTypeSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: "Dati lavorazione non validi", issues: result.error.issues });
      }
      
      const organizationId = (req as any).session.organizationId;
      const workType = await storage.createWorkType(result.data, organizationId);
      res.status(201).json(workType);
    } catch (error: any) {
      console.error("Error creating work type:", error);
      res.status(500).json({ error: "Failed to create work type" });
    }
  });

  app.patch("/api/work-types/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedWorkType = await storage.updateWorkType(id, req.body);
      res.json(updatedWorkType);
    } catch (error: any) {
      console.error("Error updating work type:", error);
      res.status(500).json({ error: "Failed to update work type" });
    }
  });

  app.delete("/api/work-types/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteWorkType(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Lavorazione non trovata" });
      }
      
      res.json({ success: true, message: "Lavorazione eliminata con successo" });
    } catch (error: any) {
      console.error("Error deleting work type:", error);
      res.status(500).json({ error: "Failed to delete work type" });
    }
  });

  // Materials (Materiali) - Master list management
  app.get("/api/materials", requireAuth, async (req, res) => {
    try {
      const organizationId = (req as any).session.organizationId;
      const materials = await storage.getAllMaterials(organizationId);
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ error: "Failed to fetch materials" });
    }
  });

  app.post("/api/materials", requireAdmin, async (req, res) => {
    try {
      const result = insertMaterialSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: "Dati materiale non validi", issues: result.error.issues });
      }
      
      const organizationId = (req as any).session.organizationId;
      const material = await storage.createMaterial(result.data, organizationId);
      res.status(201).json(material);
    } catch (error: any) {
      console.error("Error creating material:", error);
      res.status(500).json({ error: "Failed to create material" });
    }
  });

  app.patch("/api/materials/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedMaterial = await storage.updateMaterial(id, req.body);
      res.json(updatedMaterial);
    } catch (error: any) {
      console.error("Error updating material:", error);
      res.status(500).json({ error: "Failed to update material" });
    }
  });

  app.delete("/api/materials/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMaterial(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Materiale non trovato" });
      }
      
      res.json({ success: true, message: "Materiale eliminato con successo" });
    } catch (error: any) {
      console.error("Error deleting material:", error);
      res.status(500).json({ error: "Failed to delete material" });
    }
  });

  // Get work orders by client
  app.get("/api/clients/:clientId/work-orders", requireAuth, async (req, res) => {
    try {
      const organizationId = (req as any).session.organizationId;
      const workOrders = await storage.getWorkOrdersByClient(req.params.clientId, organizationId);
      res.json(workOrders);
    } catch (error) {
      console.error("Error fetching work orders:", error);
      res.status(500).json({ error: "Failed to fetch work orders" });
    }
  });

  // Create new work order (admin only)
  app.post("/api/clients/:clientId/work-orders", requireAdmin, async (req, res) => {
    try {
      const { clientId } = req.params;
      const result = insertWorkOrderSchema.safeParse({
        ...req.body,
        clientId
      });
      
      if (!result.success) {
        return res.status(400).json({ error: "Dati commessa non validi", issues: result.error.issues });
      }
      
      const organizationId = (req as any).session.organizationId;
      const workOrder = await storage.createWorkOrder(result.data, organizationId);
      res.status(201).json(workOrder);
    } catch (error: any) {
      console.error("Error creating work order:", error);
      res.status(500).json({ error: "Failed to create work order" });
    }
  });

  // Get all work orders (admin only)
  app.get("/api/work-orders", requireAdmin, async (req, res) => {
    try {
      const organizationId = (req as any).session.organizationId;
      const workOrders = await storage.getAllWorkOrders(organizationId);
      res.json(workOrders);
    } catch (error: any) {
      console.error("Error fetching work orders:", error);
      res.status(500).json({ error: "Failed to fetch work orders" });
    }
  });

  // Get all active work orders (for employees)
  app.get("/api/work-orders/active", requireAuth, async (req, res) => {
    try {
      const organizationId = (req as any).session.organizationId;
      const workOrders = await storage.getAllActiveWorkOrders(organizationId);
      res.json(workOrders);
    } catch (error: any) {
      console.error("Error fetching active work orders:", error);
      res.status(500).json({ error: "Failed to fetch active work orders" });
    }
  });

  // Get work orders statistics (admin only)
  app.get("/api/work-orders/stats", requireAdmin, async (req, res) => {
    try {
      const organizationId = (req as any).session.organizationId;
      const stats = await storage.getWorkOrdersStats(organizationId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching work order stats:", error);
      res.status(500).json({ error: "Failed to fetch work order statistics" });
    }
  });

  // Update work order (admin only)
  app.put("/api/work-orders/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = insertWorkOrderSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: "Dati commessa non validi", issues: result.error.issues });
      }
      
      const updatedWorkOrder = await storage.updateWorkOrder(id, result.data);
      res.json(updatedWorkOrder);
    } catch (error: any) {
      console.error("Error updating work order:", error);
      res.status(500).json({ error: "Failed to update work order" });
    }
  });

  // Update work order status (admin only)
  app.patch("/api/work-orders/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: "isActive deve essere un valore booleano" });
      }
      
      const updatedWorkOrder = await storage.updateWorkOrderStatus(id, isActive);
      res.json(updatedWorkOrder);
    } catch (error: any) {
      console.error("Error updating work order status:", error);
      res.status(500).json({ error: "Failed to update work order status" });
    }
  });

  // Delete work order (admin only)
  app.delete("/api/work-orders/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // First delete all operations associated with this work order
      await storage.deleteOperationsByWorkOrderId(id);
      
      // Then delete the work order
      const deleted = await storage.deleteWorkOrder(id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Commessa non trovata" });
      }
    } catch (error: any) {
      console.error("Error deleting work order:", error);
      res.status(500).json({ error: "Failed to delete work order" });
    }
  });

  // Get today's daily report for current employee
  app.get("/api/daily-reports/today", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const organizationId = (req as any).session.organizationId;
      const today = getTodayISO(); // YYYY-MM-DD format (local timezone)
      
      const report = await storage.getDailyReportByEmployeeAndDate(userId, today, organizationId);
      
      if (!report) {
        return res.status(404).json({ error: "Nessun rapportino trovato per oggi" });
      }
      
      // Get operations for this report
      const operations = await storage.getOperationsByReportId(report.id);
      
      res.json({
        ...report,
        operations
      });
    } catch (error) {
      console.error("Error fetching today's daily report:", error);
      res.status(500).json({ error: "Failed to fetch today's daily report" });
    }
  });

  // Get all daily reports (auth required)
  app.get("/api/daily-reports", requireAuth, async (req, res) => {
    try {
      const organizationId = (req as any).session.organizationId;
      const reports = await storage.getAllDailyReports(organizationId);
      
      // Enrich reports with employee names and operation counts
      const enrichedReports = await Promise.all(reports.map(async (report) => {
        const employee = await storage.getUser(report.employeeId);
        const operations = await storage.getOperationsByReportId(report.id);
        
        // Calculate total hours
        const totalHours = operations.reduce((total, op) => {
          return total + (Number(op.hours) || 0);
        }, 0);
        
        return {
          ...report,
          employeeName: employee?.fullName || "Unknown",
          operations: operations.length,
          totalHours: Math.round(totalHours * 10) / 10 // Round to 1 decimal
        };
      }));
      
      res.json(enrichedReports);
    } catch (error) {
      console.error("Error fetching daily reports:", error);
      res.status(500).json({ error: "Failed to fetch daily reports" });
    }
  });

  // Get employees who haven't submitted daily report for a specific date
  app.get("/api/daily-reports/missing-employees", requireAdmin, async (req, res) => {
    try {
      const organizationId = (req as any).session.organizationId;
      const date = (req.query.date as string) || getTodayISO(); // Default to today (local timezone)
      
      // Get all employees (users with role='employee')
      const allUsers = await storage.getAllUsers(organizationId);
      const employees = allUsers.filter(user => user.role === 'employee');
      
      // Get all daily reports for the specified date
      const reportsForDate = await storage.getDailyReportsByDate(date, organizationId);
      const employeeIdsWithReports = new Set(reportsForDate.map(report => report.employeeId));
      
      // Find employees who haven't submitted a report
      const missingEmployees = employees
        .filter(employee => !employeeIdsWithReports.has(employee.id))
        .map(employee => ({
          id: employee.id,
          fullName: employee.fullName,
          username: employee.username
        }));
      
      res.json({
        date,
        missingCount: missingEmployees.length,
        missingEmployees
      });
    } catch (error) {
      console.error("Error fetching missing employees:", error);
      res.status(500).json({ error: "Failed to fetch missing employees" });
    }
  });

  // Create new daily report
  app.post("/api/daily-reports", requireAuth, async (req, res) => {
    try {
      const { operations, date } = req.body;
      
      // Get user info from session
      const userId = (req as any).session.userId;
      const organizationId = (req as any).session.organizationId;
      
      // Build report data with employeeId from session
      const reportData = {
        employeeId: userId,
        date: date || new Date().toISOString().split('T')[0], // Use provided date or today
        status: "In attesa"
      };
      
      // Validate report data
      const reportResult = insertDailyReportSchema.safeParse(reportData);
      if (!reportResult.success) {
        return res.status(400).json({ error: "Dati rapportino non validi", issues: reportResult.error.issues });
      }
      
      // Create the report
      const newReport = await storage.createDailyReport(reportResult.data, organizationId);
      
      // Create operations if provided
      if (operations && Array.isArray(operations)) {
        for (const operation of operations) {
          const operationData = {
            ...operation,
            dailyReportId: newReport.id
          };
          
          const operationResult = insertOperationSchema.safeParse(operationData);
          
          if (operationResult.success) {
            await storage.createOperation(operationResult.data);
          }
        }
      }
      
      // Return created report with operations
      const finalOperations = await storage.getOperationsByReportId(newReport.id);
      
      res.status(201).json({
        ...newReport,
        operations: finalOperations
      });
    } catch (error) {
      console.error("Error creating daily report:", error);
      res.status(500).json({ error: "Failed to create daily report" });
    }
  });

  // Create new operation
  app.post("/api/operations", requireAuth, async (req, res) => {
    try {
      const operationData = req.body;
      
      // Validate operation data
      const operationResult = insertOperationSchema.safeParse(operationData);
      if (!operationResult.success) {
        return res.status(400).json({ 
          error: "Dati operazione non validi", 
          issues: operationResult.error.issues 
        });
      }
      
      // Create the operation
      const newOperation = await storage.createOperation(operationResult.data);
      
      res.status(201).json(newOperation);
    } catch (error) {
      console.error("Error creating operation:", error);
      res.status(500).json({ error: "Failed to create operation" });
    }
  });

  // Export daily reports as Word document (admin only)
  app.get("/api/export/daily-reports/:date", requireAdmin, async (req, res) => {
    try {
      const { date } = req.params;
      const organizationId = (req as any).session.organizationId;
      
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }

      console.log(`Generating Word report for date: ${date}`);
      const docBuffer = await wordService.generateDailyReportWord(date, organizationId);

      const filename = `Rapportini_${date}.docx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', docBuffer.length);
      
      res.send(docBuffer);
    } catch (error) {
      console.error("Error generating Word document:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to generate Word report" });
      }
    }
  });

  // Export filtered daily reports as Word document (admin only)
  app.get("/api/export/daily-reports-range", requireAdmin, async (req, res) => {
    try {
      const { from, to, status, search } = req.query;
      const organizationId = (req as any).session.organizationId;
      
      console.log(`Generating Word report for range: from=${from}, to=${to}, status=${status}, search=${search}`);
      const docBuffer = await wordService.generateDailyReportWordRange({
        fromDate: from as string | undefined,
        toDate: to as string | undefined,
        status: status as string | undefined,
        searchTerm: search as string | undefined
      }, organizationId);

      let filename = 'Rapportini';
      if (from && to) {
        filename += `_${from}_${to}`;
      } else if (from) {
        filename += `_da_${from}`;
      } else if (to) {
        filename += `_fino_${to}`;
      } else {
        filename += `_${new Date().toISOString().split('T')[0]}`;
      }
      filename += '.docx';
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', docBuffer.length);
      
      res.send(docBuffer);
    } catch (error) {
      console.error("Error generating filtered Word document:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to generate filtered Word report" });
      }
    }
  });

  // Export work order report as Word document
  app.get("/api/export/work-order/:workOrderId", requireAdmin, async (req, res) => {
    try {
      const { workOrderId } = req.params;
      const organizationId = (req as any).session.organizationId;
      
      console.log(`Generating Word report for work order: ${workOrderId}`);
      const docBuffer = await wordService.generateWorkOrderReportWord(workOrderId, organizationId);

      const workOrder = await storage.getWorkOrder(workOrderId, organizationId);
      const filename = `Commessa_${workOrder?.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', docBuffer.length);
      
      res.send(docBuffer);
    } catch (error) {
      console.error("Error generating work order Word document:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to generate work order report" });
      }
    }
  });

  // Get single daily report with operations
  app.get("/api/daily-reports/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = (req as any).session.organizationId;
      
      const report = await storage.getDailyReport(id);
      if (!report) {
        return res.status(404).json({ error: "Rapportino non trovato" });
      }
      
      const operations = await storage.getOperationsByReportId(id);
      
      // Enrich operations with client and work order names
      const enrichedOperations = await Promise.all(
        operations.map(async (op) => {
          const client = await storage.getAllClients(organizationId).then(clients => 
            clients.find(c => c.id === op.clientId)
          );
          const workOrder = await storage.getWorkOrdersByClient(op.clientId, organizationId).then(orders => 
            orders.find(wo => wo.id === op.workOrderId)
          );
          
          return {
            ...op,
            clientName: client?.name || "Cliente eliminato",
            workOrderName: workOrder?.name || "Commessa sconosciuta"
          };
        })
      );
      
      res.json({
        ...report,
        operations: enrichedOperations
      });
    } catch (error) {
      console.error("Error fetching daily report:", error);
      res.status(500).json({ error: "Failed to fetch daily report" });
    }
  });

  // Update daily report with operations
  app.put("/api/daily-reports/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { operations } = req.body;
      
      // Check if report exists
      const existingReport = await storage.getDailyReport(id);
      if (!existingReport) {
        return res.status(404).json({ error: "Rapportino non trovato" });
      }
      
      // Check authorization - only admin or report owner can edit
      if ((req as any).session.userRole !== "admin" && (req as any).session.userId !== existingReport.employeeId) {
        return res.status(403).json({ error: "Non autorizzato a modificare questo rapportino" });
      }
      
      // Update operations if provided
      if (operations && Array.isArray(operations)) {
        // Delete existing operations
        await storage.deleteOperationsByReportId(id);
        
        // Create new operations
        for (const operation of operations) {
          const operationResult = insertOperationSchema.safeParse({
            ...operation,
            dailyReportId: id
          });
          
          if (operationResult.success) {
            await storage.createOperation(operationResult.data);
          }
        }
      }
      
      // Return updated report with operations
      const finalOperations = await storage.getOperationsByReportId(id);
      res.json({
        ...existingReport,
        operations: finalOperations
      });
    } catch (error) {
      console.error("Error updating daily report:", error);
      res.status(500).json({ error: "Failed to update daily report" });
    }
  });

  // Approve daily report
  app.patch("/api/daily-reports/:id/approve", requireAdmin, async (req, res) => {
    try {
      const updatedReport = await storage.updateDailyReportStatus(req.params.id, "Approvato");
      res.json(updatedReport);
    } catch (error) {
      console.error("Error approving report:", error);
      res.status(500).json({ error: "Failed to approve report" });
    }
  });

  // Change daily report date
  app.patch("/api/daily-reports/:id/change-date", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { newDate } = req.body;
      const organizationId = (req as any).session.organizationId;

      // Validate new date
      if (!newDate || typeof newDate !== 'string') {
        return res.status(400).json({ error: "Data non valida" });
      }

      // Check if report exists
      const existingReport = await storage.getDailyReport(id);
      if (!existingReport) {
        return res.status(404).json({ error: "Rapportino non trovato" });
      }

      // Check if a report already exists for this employee on the new date
      const conflictingReport = await storage.getDailyReportByEmployeeAndDate(
        existingReport.employeeId,
        newDate,
        organizationId
      );

      if (conflictingReport && conflictingReport.id !== id) {
        return res.status(409).json({ 
          error: "Esiste già un rapportino per questo dipendente in questa data" 
        });
      }

      // Update the date
      const updatedReport = await storage.updateDailyReport(id, { date: newDate });
      res.json(updatedReport);
    } catch (error) {
      console.error("Error changing report date:", error);
      res.status(500).json({ error: "Impossibile modificare la data del rapportino" });
    }
  });

  // Update hours for a daily report (admin only)
  app.patch("/api/daily-reports/hours", requireAdmin, async (req, res) => {
    try {
      const { userId, date, ordinary, overtime } = req.body;
      const organizationId = (req as any).session.organizationId;

      // Validate inputs
      if (!userId || !date || ordinary === undefined) {
        return res.status(400).json({ error: "userId, date, and ordinary are required" });
      }

      // Find the report for this employee and date
      const report = await storage.getDailyReportByEmployeeAndDate(userId, date, organizationId);
      if (!report) {
        return res.status(404).json({ error: "Rapportino non trovato per questa data" });
      }

      // Only allow editing approved reports
      if (report.status !== 'Approvato') {
        return res.status(400).json({ error: "Solo i rapportini approvati possono essere modificati" });
      }

      // Get operations for this report
      const operations = await storage.getOperationsByReportId(report.id);
      if (operations.length === 0) {
        return res.status(400).json({ error: "Nessuna operazione trovata per questo rapportino" });
      }

      // Calculate current and target total hours
      const currentTotal = operations.reduce((sum, op) => sum + Number(op.hours), 0);
      const targetTotal = Number(ordinary) + Number(overtime || 0);

      if (operations.length === 1) {
        // Single operation: simply update the hours
        await storage.updateOperation(operations[0].id, { hours: String(targetTotal) });
      } else {
        // Multiple operations: distribute proportionally to preserve relative allocation
        if (currentTotal > 0) {
          const scaleFactor = targetTotal / currentTotal;
          for (const op of operations) {
            const newHours = Number(op.hours) * scaleFactor;
            await storage.updateOperation(op.id, { hours: String(newHours) });
          }
        } else {
          // If all operations were 0, put all hours in first operation
          await storage.updateOperation(operations[0].id, { hours: String(targetTotal) });
          for (let i = 1; i < operations.length; i++) {
            await storage.updateOperation(operations[i].id, { hours: "0" });
          }
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating report hours:", error);
      res.status(500).json({ error: "Impossibile aggiornare le ore" });
    }
  });

  // Delete daily report (admin only)
  app.delete("/api/daily-reports/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if report exists
      const existingReport = await storage.getDailyReport(id);
      if (!existingReport) {
        return res.status(404).json({ error: "Rapportino non trovato" });
      }
      
      // Delete all operations associated with this report first
      await storage.deleteOperationsByReportId(id);
      
      // Delete the report
      const deleted = await storage.deleteDailyReport(id);
      
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete report" });
      }
    } catch (error) {
      console.error("Error deleting daily report:", error);
      res.status(500).json({ error: "Failed to delete daily report" });
    }
  });

  // Get operations count for a specific work order
  app.get("/api/work-orders/:workOrderId/operations/count", requireAuth, async (req, res) => {
    try {
      const { workOrderId } = req.params;
      const count = await storage.getOperationsCountByWorkOrderId(workOrderId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching work order operations count:", error);
      res.status(500).json({ error: "Failed to fetch operations count" });
    }
  });

  // Get operations for a specific work order (for final report)
  app.get("/api/work-orders/:workOrderId/operations", requireAuth, async (req, res) => {
    try {
      const { workOrderId } = req.params;
      const organizationId = (req as any).session.organizationId;
      const operations = await storage.getOperationsByWorkOrderId(workOrderId, organizationId);
      
      // Get additional data for each operation (employee names, etc.)
      const enrichedOperations = await Promise.all(
        operations.map(async (op) => {
          const dailyReport = await storage.getAllDailyReports(organizationId).then(reports => 
            reports.find(r => r.id === op.dailyReportId)
          );
          const employee = dailyReport ? await storage.getUser(dailyReport.employeeId) : null;
          const client = await storage.getAllClients(organizationId).then(clients => 
            clients.find(c => c.id === op.clientId)
          );
          const workOrder = await storage.getWorkOrdersByClient(op.clientId, organizationId).then(orders => 
            orders.find(wo => wo.id === op.workOrderId)
          );
          
          return {
            ...op,
            employeeName: employee?.fullName || "Dipendente sconosciuto",
            employeeId: dailyReport?.employeeId,
            date: dailyReport?.date,
            clientName: client?.name || "Cliente eliminato",
            workOrderName: workOrder?.name || "Commessa sconosciuta",
            reportStatus: dailyReport?.status || "Stato sconosciuto"
          };
        })
      );
      
      // Filter only operations from approved daily reports
      const approvedOperations = enrichedOperations.filter(op => op.reportStatus === "Approvato");
      
      res.json(approvedOperations);
    } catch (error) {
      console.error("Error fetching work order operations:", error);
      res.status(500).json({ error: "Failed to fetch work order operations" });
    }
  });

  // ==================== ATTENDANCE ENTRIES (ASSENZE) ====================
  
  // Get all attendance entries for a month (admin only)
  app.get("/api/attendance-entries", requireAdmin, async (req, res) => {
    try {
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ error: "Year and month are required" });
      }
      
      const organizationId = (req as any).session.organizationId;
      const entries = await storage.getAllAttendanceEntries(
        organizationId, 
        year as string, 
        month as string
      );
      
      res.json(entries);
    } catch (error) {
      console.error("Error fetching attendance entries:", error);
      res.status(500).json({ error: "Failed to fetch attendance entries" });
    }
  });

  // Create attendance entry (admin only)
  app.post("/api/attendance-entries", requireAdmin, async (req, res) => {
    try {
      const result = insertAttendanceEntrySchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: "Dati assenza non validi", 
          issues: result.error.issues 
        });
      }
      
      const organizationId = (req as any).session.organizationId;
      
      // Check if entry already exists for this user and date
      const existing = await storage.getAttendanceEntry(
        result.data.userId,
        result.data.date,
        organizationId
      );
      
      if (existing) {
        return res.status(400).json({ 
          error: "Esiste già un'assenza per questo dipendente in questa data" 
        });
      }
      
      const entry = await storage.createAttendanceEntry(result.data, organizationId);
      res.json(entry);
    } catch (error) {
      console.error("Error creating attendance entry:", error);
      res.status(500).json({ error: "Failed to create attendance entry" });
    }
  });

  // Update attendance entry (admin only)
  app.put("/api/attendance-entries/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = updateAttendanceEntrySchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: "Dati assenza non validi", 
          issues: result.error.issues 
        });
      }
      
      const entry = await storage.updateAttendanceEntry(id, result.data);
      res.json(entry);
    } catch (error) {
      console.error("Error updating attendance entry:", error);
      res.status(500).json({ error: "Failed to update attendance entry" });
    }
  });

  // Delete attendance entry (admin only)
  app.delete("/api/attendance-entries/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAttendanceEntry(id);
      
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete attendance entry" });
      }
    } catch (error) {
      console.error("Error deleting attendance entry:", error);
      res.status(500).json({ error: "Failed to delete attendance entry" });
    }
  });

  // ==================== HOURS ADJUSTMENTS ====================
  
  // Get hours adjustment for a daily report (admin only)
  app.get("/api/hours-adjustment/:dailyReportId", requireAdmin, async (req, res) => {
    try {
      const { dailyReportId } = req.params;
      const organizationId = (req as any).session.organizationId;
      
      const adjustment = await storage.getHoursAdjustment(dailyReportId, organizationId);
      res.json(adjustment || null);
    } catch (error) {
      console.error("Error fetching hours adjustment:", error);
      res.status(500).json({ error: "Failed to fetch hours adjustment" });
    }
  });

  // Create hours adjustment (admin only)
  app.post("/api/hours-adjustment", requireAdmin, async (req, res) => {
    try {
      const result = insertHoursAdjustmentSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: "Dati aggiustamento non validi", 
          issues: result.error.issues 
        });
      }
      
      const organizationId = (req as any).session.organizationId;
      const userId = (req as any).session.userId;
      
      // Check if adjustment already exists for this report
      const existing = await storage.getHoursAdjustment(
        result.data.dailyReportId,
        organizationId
      );
      
      if (existing) {
        return res.status(400).json({ 
          error: "Esiste già un aggiustamento per questo rapportino" 
        });
      }
      
      const adjustment = await storage.createHoursAdjustment({
        dailyReportId: result.data.dailyReportId,
        adjustment: result.data.adjustment,
        reason: result.data.reason
      }, organizationId, userId);
      res.json(adjustment);
    } catch (error) {
      console.error("Error creating hours adjustment:", error);
      res.status(500).json({ error: "Failed to create hours adjustment" });
    }
  });

  // Update hours adjustment (admin only)
  app.patch("/api/hours-adjustment/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = updateHoursAdjustmentSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: "Dati aggiustamento non validi", 
          issues: result.error.issues 
        });
      }
      
      const adjustment = await storage.updateHoursAdjustment(id, result.data);
      res.json(adjustment);
    } catch (error) {
      console.error("Error updating hours adjustment:", error);
      res.status(500).json({ error: "Failed to update hours adjustment" });
    }
  });

  // Delete hours adjustment (admin only)
  app.delete("/api/hours-adjustment/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteHoursAdjustment(id);
      
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete hours adjustment" });
      }
    } catch (error) {
      console.error("Error deleting hours adjustment:", error);
      res.status(500).json({ error: "Failed to delete hours adjustment" });
    }
  });

  // ==================== MONTHLY ATTENDANCE (FOGLIO PRESENZE) ====================
  
  // Get monthly attendance data (admin only)
  app.get("/api/attendance/monthly", requireAdmin, async (req, res) => {
    try {
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ error: "Year and month are required" });
      }
      
      const organizationId = (req as any).session.organizationId;
      const data = await storage.getMonthlyAttendance(
        organizationId,
        year as string,
        month as string
      );
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching monthly attendance:", error);
      res.status(500).json({ error: "Failed to fetch monthly attendance" });
    }
  });

  // Export monthly attendance to Excel (admin only)
  app.get("/api/attendance/export-excel", requireAdmin, async (req, res) => {
    try {
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ error: "Year and month are required" });
      }
      
      const organizationId = (req as any).session.organizationId;
      const buffer = await generateAttendanceExcel(
        organizationId,
        year as string,
        month as string
      );
      
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Presenze_${year}-${month}.xlsx`
      );
      
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Error exporting attendance to Excel:", error);
      res.status(500).json({ error: "Failed to export attendance to Excel" });
    }
  });

  // Photo upload endpoint - Get presigned URL for upload
  app.post("/api/operations/photos/upload", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Photo metadata update endpoint - Set ACL policy after upload
  app.put("/api/operations/photos", requireAuth, async (req, res) => {
    try {
      if (!req.body.photoURL) {
        return res.status(400).json({ error: "photoURL is required" });
      }

      const userId = (req as any).session.userId;
      const organizationId = (req as any).session.organizationId;

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoURL,
        {
          owner: userId,
          organizationId: organizationId,
          visibility: "private",
          aclRules: [
            {
              group: {
                type: ObjectAccessGroupType.ORGANIZATION,
                id: organizationId,
              },
              permission: ObjectPermission.READ,
            },
          ],
        }
      );

      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting photo metadata:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Photo download endpoint - Serve photos with ACL check
  app.get("/objects/:objectPath(*)", requireAuth, async (req, res) => {
    const userId = (req as any).session.userId;
    const organizationId = (req as any).session.organizationId;
    const objectStorageService = new ObjectStorageService();
    
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        organizationId: organizationId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.sendStatus(401);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Push Notification Routes
  
  // Get VAPID public key
  app.get("/api/push-subscription/vapid-public-key", (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!publicKey) {
      return res.status(500).json({ error: "VAPID public key not configured" });
    }
    
    res.json({ publicKey });
  });

  // Subscribe to push notifications
  app.post("/api/push-subscription", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const organizationId = (req as any).session.organizationId;
      const { subscription } = req.body;

      if (!subscription) {
        return res.status(400).json({ error: "Subscription is required" });
      }

      const pushSubscription = await storage.createPushSubscription(
        { subscription },
        userId,
        organizationId
      );

      res.json({ success: true, subscription: pushSubscription });
    } catch (error) {
      console.error("Error creating push subscription:", error);
      res.status(500).json({ error: "Failed to create push subscription" });
    }
  });

  // Unsubscribe from push notifications
  app.delete("/api/push-subscription", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const organizationId = (req as any).session.organizationId;

      const deleted = await storage.deletePushSubscription(userId, organizationId);

      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Subscription not found" });
      }
    } catch (error) {
      console.error("Error deleting push subscription:", error);
      res.status(500).json({ error: "Failed to delete push subscription" });
    }
  });

  // Test push notification (admin only) - for manual testing
  app.post("/api/push-subscription/test", requireAdmin, async (req, res) => {
    try {
      const organizationId = (req as any).session.organizationId;
      const { schedulerService } = await import("./schedulerService");
      
      // Manually trigger the reminder check
      await schedulerService.triggerManualCheck();
      
      res.json({ 
        success: true, 
        message: "Manual reminder check triggered. Check logs for results." 
      });
    } catch (error) {
      console.error("Error triggering manual check:", error);
      res.status(500).json({ error: "Failed to trigger manual check" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
