import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, ImageRun, HeadingLevel, AlignmentType, WidthType, BorderStyle } from 'docx';
import { storage } from './storage';
import { DailyReport, Operation, User, Client, WorkOrder } from '@shared/schema';
import { formatDateToItalianLong } from '../shared/dateUtils';
import { objectStorageClient } from './objectStorage';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export class WordService {
  
  async generateDailyReportWord(date: string, organizationId: string): Promise<Buffer> {
    const reports = await storage.getDailyReportsByDate(date, organizationId);
    
    if (reports.length === 0) {
      // Format date in Italian format for user-friendly error message
      const [year, month, day] = date.split('-');
      const italianDate = `${day}/${month}/${year}`;
      throw new Error(`Nessun rapportino trovato per la data ${italianDate}. Verifica che ci siano rapportini approvati per questa data.`);
    }

    // Get all related data
    const clients = await storage.getAllClients(organizationId);
    const clientsMap = new Map(clients.map(c => [c.id, c]));
    
    // Get all work orders
    const allWorkOrders: WorkOrder[] = [];
    for (const client of clients) {
      const workOrders = await storage.getWorkOrdersByClient(client.id, organizationId);
      allWorkOrders.push(...workOrders);
    }
    const workOrdersMap = new Map(allWorkOrders.map(wo => [wo.id, wo]));

    // Get all hours adjustments for these reports
    const adjustmentsPromises = reports.map(r => storage.getHoursAdjustment(r.id, organizationId));
    const adjustments = await Promise.all(adjustmentsPromises);
    const adjustmentsMap = new Map(
      adjustments
        .filter((adj): adj is NonNullable<typeof adj> => adj !== undefined && adj !== null)
        .map(adj => [adj.dailyReportId, adj])
    );

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
      const adjustment = adjustmentsMap.get(report.id);
      
      if (user && operations.length > 0) {
        const employeeSection = await this.createEmployeeSection(
          user,
          report,
          operations,
          clientsMap,
          workOrdersMap,
          adjustment
        );
        documentSections.push(...employeeSection);
        
        // Add minimal spacing between employees
        if (i < reports.length - 1) {
          documentSections.push(
            new Paragraph({
              text: '─────────────────────────────────────────────────────────',
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 100 }
            })
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
    workOrdersMap: Map<string, WorkOrder>,
    adjustment?: any
  ): Promise<Paragraph[]> {
    
    let totalHours = operations.reduce((sum, op) => sum + this.parseHours(op.hours), 0);
    const originalHours = totalHours;
    
    // Apply hours adjustment if exists
    if (adjustment) {
      const adjustmentValue = parseFloat(adjustment.adjustment);
      if (!isNaN(adjustmentValue)) {
        totalHours += adjustmentValue;
      }
    }
    
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
              children: adjustment ? [
                new TextRun({ text: originalHours.toFixed(1) + 'h ', bold: true }),
                new TextRun({ 
                  text: `(aggiustamento: ${parseFloat(adjustment.adjustment) >= 0 ? '+' : ''}${parseFloat(adjustment.adjustment).toFixed(1)}h) `,
                  size: 20
                }),
                new TextRun({ text: '= ' + totalHours.toFixed(1) + 'h', bold: true })
              ] : [
                new TextRun({ text: totalHours.toFixed(1) + 'h', bold: true })
              ],
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
    

    // Add photos for each operation that has them
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (op.photos && op.photos.length > 0) {
        const client = clientsMap.get(op.clientId);
        const workOrder = workOrdersMap.get(op.workOrderId);
        
        // Load photos in parallel
        const photoPromises = op.photos.map(photoPath => this.getPhotoAsBuffer(photoPath, 300));
        const photoData = await Promise.all(photoPromises);
        
        // Filter out null values
        const validPhotos = photoData.filter(data => data !== null) as { buffer: Buffer; width: number; height: number }[];
        
        if (validPhotos.length > 0) {
          // Add section header for photos
          sections.push(
            new Paragraph({
              children: [new TextRun({
                text: `Foto Operazione ${i + 1} - ${client?.name || 'N/A'} / ${workOrder?.name || 'N/A'}`,
                bold: true
              })],
              spacing: { before: 300, after: 100 }
            })
          );
          
          // Add images in a paragraph (horizontal layout) with preserved aspect ratio
          const imageRuns: ImageRun[] = validPhotos.map(photo => 
            new ImageRun({
              type: 'jpg',
              data: photo.buffer,
              transformation: {
                width: photo.width,
                height: photo.height
              }
            })
          );
          
          // Create paragraph with images (with spacing between them using TextRun spacers)
          const imageChildren: (ImageRun | TextRun)[] = [];
          imageRuns.forEach((img, idx) => {
            imageChildren.push(img);
            if (idx < imageRuns.length - 1) {
              // Add spacing between images
              imageChildren.push(new TextRun({ text: '  ' }));
            }
          });
          
          sections.push(
            new Paragraph({
              children: imageChildren,
              spacing: { after: 200 }
            })
          );
        }
      }
    }

    return sections;
  }

  private formatDate(dateStr: string): string {
    return formatDateToItalianLong(dateStr);
  }

  private async getPhotoAsBuffer(photoPath: string, maxWidth: number = 300): Promise<{ buffer: Buffer; width: number; height: number } | null> {
    try {
      // Parse bucket name and object path from the photo path
      // photoPath format: "operations/photos/xxxxx.jpg"
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        console.warn('DEFAULT_OBJECT_STORAGE_BUCKET_ID not set');
        return null;
      }

      const bucket = objectStorageClient.bucket(bucketId);
      const file = bucket.file(photoPath);
      
      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        console.warn(`Photo not found: ${photoPath}`);
        return null;
      }

      // Download file as buffer
      const [buffer] = await file.download();
      
      // Resize and compress image using Sharp
      const resizedBuffer = await sharp(buffer)
        .resize(maxWidth, null, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      
      // Return buffer with actual dimensions
      return {
        buffer: resizedBuffer.data,
        width: resizedBuffer.info.width,
        height: resizedBuffer.info.height
      };
    } catch (error) {
      console.error(`Error loading photo ${photoPath}:`, error);
      return null;
    }
  }

  async generateWorkOrderReportWord(workOrderId: string, organizationId: string): Promise<Buffer> {
    const workOrder = await storage.getWorkOrder(workOrderId, organizationId);
    
    if (!workOrder) {
      throw new Error(`Commessa non trovata`);
    }

    const client = (await storage.getAllClients(organizationId)).find(c => c.id === workOrder.clientId);
    const operations = await storage.getOperationsByWorkOrderId(workOrderId, organizationId);

    // Filter only operations from approved reports
    const dailyReports = await storage.getAllDailyReports(organizationId);
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


    const doc = new Document({
      sections: [{
        properties: {},
        children: documentSections
      }]
    });

    return await Packer.toBuffer(doc);
  }

  async generateDailyReportWordRange(filters: {
    fromDate?: string;
    toDate?: string;
    status?: string;
    searchTerm?: string;
  }, organizationId: string): Promise<Buffer> {
    // Get all reports
    let allReports = await storage.getAllDailyReports(organizationId);
    
    // Apply filters
    let filteredReports = allReports;
    
    // Filter by date range
    // Use string comparison directly since YYYY-MM-DD is lexicographically sortable
    if (filters.fromDate || filters.toDate) {
      filteredReports = filteredReports.filter(report => {
        const reportDate = report.date;
        
        if (filters.fromDate && filters.toDate) {
          return reportDate >= filters.fromDate && reportDate <= filters.toDate;
        } else if (filters.fromDate) {
          return reportDate >= filters.fromDate;
        } else if (filters.toDate) {
          return reportDate <= filters.toDate;
        }
        return true;
      });
    }
    
    // Filter by status
    if (filters.status && filters.status !== 'all') {
      filteredReports = filteredReports.filter(report => report.status === filters.status);
    }
    
    // Filter by search term (employee name)
    if (filters.searchTerm) {
      const users = await storage.getAllUsers(organizationId);
      const usersMap = new Map(users.map(u => [u.id, u]));
      filteredReports = filteredReports.filter(report => {
        const user = usersMap.get(report.employeeId);
        return user?.fullName.toLowerCase().includes(filters.searchTerm!.toLowerCase());
      });
    }
    
    if (filteredReports.length === 0) {
      throw new Error('Nessun rapportino trovato con i filtri specificati.');
    }

    // Get all related data
    const clients = await storage.getAllClients(organizationId);
    const clientsMap = new Map(clients.map(c => [c.id, c]));
    
    // Get all work orders
    const allWorkOrders: WorkOrder[] = [];
    for (const client of clients) {
      const workOrders = await storage.getWorkOrdersByClient(client.id, organizationId);
      allWorkOrders.push(...workOrders);
    }
    const workOrdersMap = new Map(allWorkOrders.map(wo => [wo.id, wo]));

    // Get all hours adjustments for these reports
    const adjustmentsPromises = filteredReports.map(r => storage.getHoursAdjustment(r.id, organizationId));
    const adjustments = await Promise.all(adjustmentsPromises);
    const adjustmentsMap = new Map(
      adjustments
        .filter((adj): adj is NonNullable<typeof adj> => adj !== undefined && adj !== null)
        .map(adj => [adj.dailyReportId, adj])
    );

    // Build document sections
    const documentSections: Paragraph[] = [];
    
    // Document header
    let dateRange = '';
    if (filters.fromDate && filters.toDate) {
      dateRange = `${this.formatDate(filters.fromDate)} - ${this.formatDate(filters.toDate)}`;
    } else if (filters.fromDate) {
      dateRange = `da ${this.formatDate(filters.fromDate)}`;
    } else if (filters.toDate) {
      dateRange = `fino a ${this.formatDate(filters.toDate)}`;
    } else {
      dateRange = 'Tutti i rapportini';
    }
    
    documentSections.push(
      new Paragraph({
        text: 'METALTEC Scoccia S.R.L.',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        text: `Rapportini Giornalieri - ${dateRange}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      new Paragraph({ text: '' }) // Empty line
    );
    
    // Build content for each report
    for (let i = 0; i < filteredReports.length; i++) {
      const report = filteredReports[i];
      const user = await storage.getUser(report.employeeId);
      const operations = await storage.getOperationsByReportId(report.id);
      const adjustment = adjustmentsMap.get(report.id);
      
      if (user && operations.length > 0) {
        const employeeSection = await this.createEmployeeSection(
          user,
          report,
          operations,
          clientsMap,
          workOrdersMap,
          adjustment
        );
        documentSections.push(...employeeSection);
        
        // Add minimal spacing between employees
        if (i < filteredReports.length - 1) {
          documentSections.push(
            new Paragraph({
              text: '─────────────────────────────────────────────────────────',
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 100 }
            })
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
}
