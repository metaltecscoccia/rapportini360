import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { PDFService } from "./pdfService";
import { 
  insertAttendanceRecordSchema,
  AttendanceStatusEnum
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const pdfService = new PDFService();

  // Get all clients
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // Get work orders by client
  app.get("/api/clients/:clientId/work-orders", async (req, res) => {
    try {
      const workOrders = await storage.getWorkOrdersByClient(req.params.clientId);
      res.json(workOrders);
    } catch (error) {
      console.error("Error fetching work orders:", error);
      res.status(500).json({ error: "Failed to fetch work orders" });
    }
  });

  // Get all daily reports
  app.get("/api/daily-reports", async (req, res) => {
    try {
      const reports = await storage.getAllDailyReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching daily reports:", error);
      res.status(500).json({ error: "Failed to fetch daily reports" });
    }
  });

  // Export daily reports as PDF
  app.get("/api/export/daily-reports/:date", async (req, res) => {
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

  // Approve daily report
  app.patch("/api/daily-reports/:id/approve", async (req, res) => {
    try {
      const updatedReport = await storage.updateDailyReportStatus(req.params.id, "Approvato");
      res.json(updatedReport);
    } catch (error) {
      console.error("Error approving report:", error);
      res.status(500).json({ error: "Failed to approve report" });
    }
  });

  // Get attendance records by date range
  app.get("/api/attendance", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      const records = await storage.getAttendanceRecordsByDateRange(startDate as string, endDate as string);
      res.json(records);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      res.status(500).json({ error: "Failed to fetch attendance records" });
    }
  });

  // Upsert attendance record
  app.put("/api/attendance", async (req, res) => {
    try {
      const result = insertAttendanceRecordSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: "Invalid attendance record data", issues: result.error.issues });
      }
      
      // Validate attendance status
      const statusValidation = AttendanceStatusEnum.safeParse(result.data.status);
      if (!statusValidation.success) {
        return res.status(400).json({ error: "Invalid attendance status" });
      }
      
      const record = await storage.upsertAttendanceRecord(result.data);
      res.json(record);
    } catch (error) {
      console.error("Error upserting attendance record:", error);
      res.status(500).json({ error: "Failed to save attendance record" });
    }
  });

  // Delete attendance record
  app.delete("/api/attendance/:employeeId/:date", async (req, res) => {
    try {
      const { employeeId, date } = req.params;
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      const deleted = await storage.deleteAttendanceRecord(employeeId, date);
      
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Attendance record not found" });
      }
    } catch (error) {
      console.error("Error deleting attendance record:", error);
      res.status(500).json({ error: "Failed to delete attendance record" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
