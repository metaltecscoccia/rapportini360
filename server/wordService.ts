import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle } from 'docx';
import { storage } from './storage';
import { DailyReport, Operation, User, Client, WorkOrder } from '@shared/schema';
import fs from 'fs';
import path from 'path';

export class WordService {
  
  async generateDailyReportWord(date: string): Promise<Buffer> {
    const reports = await storage.getDailyReportsByDate(date);
    
    if (reports.length === 0) {
      // Format date in Italian format for user-friendly error message
      const [year, month, day] = date.split('-');
      const italianDate = `${day}/${month}/${year}`;
      throw new Error(`Nessun rapportino trovato per la data ${italianDate}. Verifica che ci siano rapportini approvati per questa data.`);
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

    // Build document sections
    const documentSections: Paragraph[] = [];
    
    // Document header
    documentSections.push(
      new Paragraph({
        text: 'METALTEC Scoccia S.R.L.',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        text: `Rapportini Giornalieri - ${this.formatDate(date)}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      new Paragraph({ text: '' }) // Empty line
    );
    
    // Build content for each employee
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
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
        documentSections.push(...employeeSection);
        
        // Add spacing between employees
        if (i < reports.length - 1) {
          documentSections.push(
            new Paragraph({ text: '' }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: '─────────────────────────────────────────────────────────',
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 }
            }),
            new Paragraph({ text: '' })
          );
        }
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: documentSections
      }]
    });

    return await Packer.toBuffer(doc);
  }

  // Calculate hours from the hours field (which is already a string like "3.5")
  private parseHours(hoursStr: string): number {
    const hours = parseFloat(hoursStr);
    return isNaN(hours) ? 0 : hours;
  }

  private async createEmployeeSection(
    user: User,
    report: DailyReport,
    operations: Operation[],
    clientsMap: Map<string, Client>,
    workOrdersMap: Map<string, WorkOrder>
  ): Promise<Paragraph[]> {
    
    const totalHours = operations.reduce((sum, op) => sum + this.parseHours(op.hours), 0);
    
    const sections: Paragraph[] = [];
    
    // Employee name and status
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: user.fullName,
            bold: true,
            size: 28
          }),
          new TextRun({
            text: `     [${report.status}]`,
            bold: true,
            size: 24,
            color: report.status === 'Approvato' ? '16a34a' : 'eab308'
          })
        ],
        spacing: { before: 300, after: 200 }
      })
    );

    // Create operations table
    const tableRows: TableRow[] = [];
    
    // Header row
    tableRows.push(
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            children: [new Paragraph({ text: 'Cliente', alignment: AlignmentType.CENTER })],
            shading: { fill: 'E5E7EB' },
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Commessa', alignment: AlignmentType.CENTER })],
            shading: { fill: 'E5E7EB' },
            width: { size: 20, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Lavorazione', alignment: AlignmentType.CENTER })],
            shading: { fill: 'E5E7EB' },
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Ore', alignment: AlignmentType.CENTER })],
            shading: { fill: 'E5E7EB' },
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Note', alignment: AlignmentType.CENTER })],
            shading: { fill: 'E5E7EB' },
            width: { size: 30, type: WidthType.PERCENTAGE }
          })
        ]
      })
    );

    // Add operation rows
    operations.forEach(op => {
      const client = clientsMap.get(op.clientId);
      const workOrder = workOrdersMap.get(op.workOrderId);
      const hours = this.parseHours(op.hours);
      
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: client?.name || 'N/A' })]
            }),
            new TableCell({
              children: [new Paragraph({ text: workOrder?.name || 'N/A' })]
            }),
            new TableCell({
              children: [new Paragraph({ text: op.workTypes.join(', ') })]
            }),
            new TableCell({
              children: [new Paragraph({ text: hours.toFixed(1) + 'h', alignment: AlignmentType.CENTER })]
            }),
            new TableCell({
              children: [new Paragraph({ text: op.notes || '-' })]
            })
          ]
        })
      );
    });

    // Add total row
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: '' })] }),
          new TableCell({ children: [new Paragraph({ text: '' })] }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'TOTALE:', bold: true })],
              alignment: AlignmentType.RIGHT
            })],
            shading: { fill: 'F3F4F6' }
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: totalHours.toFixed(1) + 'h', bold: true })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: 'F3F4F6' }
          }),
          new TableCell({
            children: [new Paragraph({ text: '' })],
            shading: { fill: 'F3F4F6' }
          })
        ]
      })
    );

    // Add the table directly (not inside a Paragraph)
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' }
        }
      }) as any
    );
    
    // Summary
    sections.push(
      new Paragraph({
        children: [new TextRun({
          text: `Riepilogo: ${operations.length} operazioni • ${totalHours.toFixed(1)} ore totali`,
          italics: true
        })],
        spacing: { before: 200 }
      })
    );

    return sections;
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

  async generateWorkOrderReportWord(workOrderId: string): Promise<Buffer> {
    const workOrder = await storage.getWorkOrder(workOrderId);
    
    if (!workOrder) {
      throw new Error(`Commessa non trovata`);
    }

    const client = (await storage.getAllClients()).find(c => c.id === workOrder.clientId);
    const operations = await storage.getOperationsByWorkOrderId(workOrderId);

    // Filter only operations from approved reports
    const dailyReports = await storage.getAllDailyReports();
    const approvedOperations = operations.filter(op => {
      const report = dailyReports.find(r => r.id === op.dailyReportId);
      return report?.status === 'Approvato';
    });

    if (approvedOperations.length === 0) {
      throw new Error(`Nessuna operazione approvata trovata per la commessa "${workOrder.name}"`);
    }

    // Get employee data for each operation
    const enrichedOperations = await Promise.all(
      approvedOperations.map(async (op) => {
        const report = dailyReports.find(r => r.id === op.dailyReportId);
        const employee = report ? await storage.getUser(report.employeeId) : null;
        return {
          ...op,
          employeeName: employee?.fullName || 'Dipendente sconosciuto',
          date: report?.date || 'N/A'
        };
      })
    );

    // Sort by date
    enrichedOperations.sort((a, b) => a.date.localeCompare(b.date));

    const documentSections: (Paragraph | Table)[] = [];
    
    // Document header
    documentSections.push(
      new Paragraph({
        text: 'METALTEC Scoccia S.R.L.',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        text: `Report Commessa`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({ text: '' })
    );

    // Work order details
    documentSections.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Commessa: ', bold: true }),
          new TextRun({ text: workOrder.name })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Cliente: ', bold: true }),
          new TextRun({ text: client?.name || 'N/A' })
        ]
      })
    );

    if (workOrder.description) {
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Descrizione: ', bold: true }),
            new TextRun({ text: workOrder.description })
          ]
        })
      );
    }

    documentSections.push(new Paragraph({ text: '', spacing: { after: 300 } }));

    // Operations table
    const tableRows: TableRow[] = [];
    
    // Header row
    tableRows.push(
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            children: [new Paragraph({ text: 'Data', alignment: AlignmentType.CENTER })],
            shading: { fill: 'E5E7EB' },
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Dipendente', alignment: AlignmentType.CENTER })],
            shading: { fill: 'E5E7EB' },
            width: { size: 20, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Tipo Lavorazione', alignment: AlignmentType.CENTER })],
            shading: { fill: 'E5E7EB' },
            width: { size: 30, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Ore', alignment: AlignmentType.CENTER })],
            shading: { fill: 'E5E7EB' },
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Note', alignment: AlignmentType.CENTER })],
            shading: { fill: 'E5E7EB' },
            width: { size: 25, type: WidthType.PERCENTAGE }
          })
        ]
      })
    );

    // Add operation rows
    let totalHours = 0;
    enrichedOperations.forEach(op => {
      const hours = this.parseHours(op.hours);
      totalHours += hours;
      
      const [year, month, day] = op.date.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: formattedDate })]
            }),
            new TableCell({
              children: [new Paragraph({ text: op.employeeName })]
            }),
            new TableCell({
              children: [new Paragraph({ text: op.workTypes.join(', ') })]
            }),
            new TableCell({
              children: [new Paragraph({ text: hours.toFixed(1) + 'h', alignment: AlignmentType.CENTER })]
            }),
            new TableCell({
              children: [new Paragraph({ text: op.notes || '-' })]
            })
          ]
        })
      );
    });

    // Add total row
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: '' })] }),
          new TableCell({ children: [new Paragraph({ text: '' })] }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'TOTALE ORE:', bold: true })],
              alignment: AlignmentType.RIGHT
            })],
            shading: { fill: 'F3F4F6' }
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: totalHours.toFixed(1) + 'h', bold: true })],
              alignment: AlignmentType.CENTER
            })],
            shading: { fill: 'F3F4F6' }
          }),
          new TableCell({
            children: [new Paragraph({ text: '' })],
            shading: { fill: 'F3F4F6' }
          })
        ]
      })
    );

    // Add table
    documentSections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' }
        }
      }) as any
    );

    // Summary
    documentSections.push(
      new Paragraph({
        children: [new TextRun({
          text: `Riepilogo: ${enrichedOperations.length} operazioni • ${totalHours.toFixed(1)} ore totali`,
          italics: true
        })],
        spacing: { before: 200, after: 200 }
      })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: documentSections
      }]
    });

    return await Packer.toBuffer(doc);
  }
}
