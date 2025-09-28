import * as PdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { storage } from './storage';
import { DailyReport, Operation, User, Client, WorkOrder } from '@shared/schema';
import fs from 'fs';
import path from 'path';

// Set fonts for pdfMake
if (pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  (PdfMake as any).vfs = pdfFonts.pdfMake.vfs;
} else {
  console.warn('PDFMake fonts not loaded correctly');
}

export class PDFService {
  
  async generateDailyReportPDF(date: string): Promise<Buffer> {
    const reports = await storage.getDailyReportsByDate(date);
    
    if (reports.length === 0) {
      throw new Error(`Nessun rapportino trovato per la data ${date}`);
    }

    // Get all related data
    const clients = await storage.getAllClients();
    const clientsMap = new Map(clients.map(c => [c.id, c]));
    
    // Get all work orders
    const allWorkOrders: WorkOrder[] = [];
    for (const client of clients) {
      const workOrders = await storage.getWorkOrdersByClient(client.id);
      allWorkOrders.push(...workOrders);
    }
    const workOrdersMap = new Map(allWorkOrders.map(wo => [wo.id, wo]));

    // Build content for each employee
    const employeeReports: Content[] = [];
    
    for (const report of reports) {
      const user = await storage.getUser(report.employeeId);
      const operations = await storage.getOperationsByReportId(report.id);
      
      if (user && operations.length > 0) {
        const employeeSection = await this.createEmployeeSection(
          user,
          report,
          operations,
          clientsMap,
          workOrdersMap
        );
        employeeReports.push(employeeSection);
        
        // Add page break between employees (except for the last one)
        if (reports.indexOf(report) < reports.length - 1) {
          employeeReports.push({ text: '', pageBreak: 'after' });
        }
      }
    }

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      
      header: {
        columns: [
          {
            image: await this.getLogoBase64(),
            width: 80,
            margin: [40, 20, 0, 0]
          },
          {
            stack: [
              { text: 'METALTEC Scoccia S.R.L.', style: 'companyName' },
              { text: `Rapportini Giornalieri - ${this.formatDate(date)}`, style: 'reportTitle' }
            ],
            margin: [0, 25, 40, 0]
          }
        ],
        margin: [0, 0, 0, 20]
      },

      content: employeeReports,
      
      styles: {
        companyName: {
          fontSize: 16,
          bold: true,
          color: '#1e40af'
        },
        reportTitle: {
          fontSize: 12,
          color: '#666666',
          margin: [0, 5, 0, 0]
        },
        employeeName: {
          fontSize: 14,
          bold: true,
          margin: [0, 20, 0, 10]
        },
        sectionHeader: {
          fontSize: 12,
          bold: true,
          margin: [0, 15, 0, 5]
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          fillColor: '#f3f4f6'
        },
        tableCell: {
          fontSize: 9,
          margin: [2, 4, 2, 4]
        },
        statusBadge: {
          fontSize: 9,
          bold: true,
          margin: [0, 2, 0, 2]
        }
      }
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = PdfMake.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer: Buffer) => {
        resolve(buffer);
      });
    });
  }

  // Funzione per calcolare ore da startTime e endTime
  private calculateHours(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    
    // Gestione passaggio mezzanotte
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end.getTime() - start.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Arrotonda a 2 decimali
  }

  private async createEmployeeSection(
    user: User,
    report: DailyReport,
    operations: Operation[],
    clientsMap: Map<string, Client>,
    workOrdersMap: Map<string, WorkOrder>
  ): Promise<Content> {
    
    const totalHours = operations.reduce((sum, op) => sum + this.calculateHours(op.startTime, op.endTime), 0);
    
    // Operations table
    const tableBody = [
      // Header
      [
        { text: 'Cliente', style: 'tableHeader' },
        { text: 'Commessa', style: 'tableHeader' },
        { text: 'Lavorazione', style: 'tableHeader' },
        { text: 'Orario', style: 'tableHeader' },
        { text: 'Ore', style: 'tableHeader' },
        { text: 'Note', style: 'tableHeader' }
      ]
    ];

    // Add operation rows
    operations.forEach(op => {
      const client = clientsMap.get(op.clientId);
      const workOrder = workOrdersMap.get(op.workOrderId);
      const hours = this.calculateHours(op.startTime, op.endTime);
      
      tableBody.push([
        { text: client?.name || 'N/A', style: 'tableCell' },
        { text: workOrder?.name || 'N/A', style: 'tableCell' },
        { text: op.workType, style: 'tableCell' },
        { text: `${op.startTime} - ${op.endTime}`, style: 'tableCell', alignment: 'center' },
        { text: hours.toString() + 'h', style: 'tableCell', alignment: 'center' },
        { text: op.notes || '-', style: 'tableCell' }
      ]);
    });

    // Add total row
    tableBody.push([
      { text: '', border: [false, true, false, false] },
      { text: '', border: [false, true, false, false] },
      { text: '', border: [false, true, false, false] },
      { text: 'TOTALE:', style: 'tableHeader', border: [false, true, false, false] },
      { text: totalHours.toString() + 'h', style: 'tableHeader', alignment: 'center', border: [false, true, false, false] },
      { text: '', border: [false, true, false, false] }
    ]);

    return {
      stack: [
        // Employee header
        {
          columns: [
            { text: user.fullName, style: 'employeeName' },
            { 
              text: report.status, 
              style: 'statusBadge',
              color: report.status === 'Approvato' ? '#16a34a' : '#eab308',
              alignment: 'right'
            }
          ]
        },
        
        // Operations table
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', 'auto', 'auto', '*'],
            body: tableBody
          },
          layout: 'lightHorizontalLines'
        },
        
        // Summary
        {
          text: `Operazioni: ${operations.length} | Ore totali: ${totalHours}`,
          style: 'sectionHeader',
          margin: [0, 10, 0, 0]
        }
      ]
    };
  }

  private async getLogoBase64(): Promise<string> {
    try {
      // Try to read the logo file
      const logoPath = path.join(process.cwd(), 'attached_assets', '3F8AF681-7737-41D8-A852-3AEB802C183F_1759092829478.png');
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
      console.warn('Logo not found, using placeholder');
      // Return a small placeholder base64 image if logo is not found
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}