import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { PDFService } from "./pdfService";
import { 
  insertUserSchema,
  updateUserSchema,
  insertDailyReportSchema,
  updateDailyReportSchema,
  insertOperationSchema,
  updateOperationSchema,
  insertClientSchema,
  insertWorkOrderSchema
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
  const pdfService = new PDFService();

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
      const users = await storage.getAllUsers();
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
      const user = await storage.createUser(result.data);
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
      const clients = await storage.getAllClients();
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
      
      const client = await storage.createClient(result.data);
      res.status(201).json(client);
    } catch (error: any) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  // Get work orders by client
  app.get("/api/clients/:clientId/work-orders", requireAuth, async (req, res) => {
    try {
      const workOrders = await storage.getWorkOrdersByClient(req.params.clientId);
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
      
      const workOrder = await storage.createWorkOrder(result.data);
      res.status(201).json(workOrder);
    } catch (error: any) {
      console.error("Error creating work order:", error);
      res.status(500).json({ error: "Failed to create work order" });
    }
  });

  // Get all daily reports (auth required)
  app.get("/api/daily-reports", requireAuth, async (req, res) => {
    try {
      const reports = await storage.getAllDailyReports();
      
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

  // Create new daily report
  app.post("/api/daily-reports", requireAuth, async (req, res) => {
    try {
      const { operations, ...reportData } = req.body;
      
      // Validate report data
      const reportResult = insertDailyReportSchema.safeParse(reportData);
      if (!reportResult.success) {
        return res.status(400).json({ error: "Dati rapportino non validi", issues: reportResult.error.issues });
      }
      
      // Create the report
      const newReport = await storage.createDailyReport(reportResult.data);
      
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

  // Export daily reports as PDF (admin only)
  app.get("/api/export/daily-reports/:date", requireAdmin, async (req, res) => {
    try {
      const { date } = req.params;
      
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }

      console.log(`Generating PDF report for date: ${date}`);
      const pdfBuffer = await pdfService.generateDailyReportPDF(date);

      const filename = `Rapportini_${date}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to generate PDF report" });
      }
    }
  });

  // Get single daily report with operations
  app.get("/api/daily-reports/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const report = await storage.getDailyReport(id);
      if (!report) {
        return res.status(404).json({ error: "Rapportino non trovato" });
      }
      
      const operations = await storage.getOperationsByReportId(id);
      
      res.json({
        ...report,
        operations
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
      const { operations, ...reportData } = req.body;
      
      // Check if report exists
      const existingReport = await storage.getDailyReport(id);
      if (!existingReport) {
        return res.status(404).json({ error: "Rapportino non trovato" });
      }
      
      // Check authorization - only admin or report owner can edit
      if ((req as any).session.userRole !== "admin" && (req as any).session.userId !== existingReport.employeeId) {
        return res.status(403).json({ error: "Non autorizzato a modificare questo rapportino" });
      }
      
      // Validate report data
      const reportResult = updateDailyReportSchema.safeParse(reportData);
      if (!reportResult.success) {
        return res.status(400).json({ error: "Dati rapportino non validi", issues: reportResult.error.issues });
      }
      
      // Update the report
      const updatedReport = await storage.updateDailyReport(id, reportResult.data);
      
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
        ...updatedReport,
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


  // Get operations for a specific work order (for final report)
  app.get("/api/work-orders/:workOrderId/operations", requireAuth, async (req, res) => {
    try {
      const { workOrderId } = req.params;
      const operations = await storage.getOperationsByWorkOrderId(workOrderId);
      
      // Get additional data for each operation (employee names, etc.)
      const enrichedOperations = await Promise.all(
        operations.map(async (op) => {
          const dailyReport = await storage.getAllDailyReports().then(reports => 
            reports.find(r => r.id === op.dailyReportId)
          );
          const employee = dailyReport ? await storage.getUser(dailyReport.employeeId) : null;
          const client = await storage.getAllClients().then(clients => 
            clients.find(c => c.id === op.clientId)
          );
          const workOrder = await storage.getWorkOrdersByClient(op.clientId).then(orders => 
            orders.find(wo => wo.id === op.workOrderId)
          );
          
          return {
            ...op,
            employeeName: employee?.fullName || "Unknown",
            employeeId: dailyReport?.employeeId,
            date: dailyReport?.date,
            clientName: client?.name || "Unknown",
            workOrderName: workOrder?.name || "Unknown",
            reportStatus: dailyReport?.status || "Unknown"
          };
        })
      );
      
      res.json(enrichedOperations);
    } catch (error) {
      console.error("Error fetching work order operations:", error);
      res.status(500).json({ error: "Failed to fetch work order operations" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
