import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { storage } from './storage';
import { DailyReport, Operation, User, Client, WorkOrder } from '@shared/schema';
import { formatDateToItalianLong } from '../shared/dateUtils';
import { objectStorageClient } from './objectStorage';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export class PDFService {
  
  async generateDailyReportPDF(date: string, organizationId: string): Promise<Buffer> {
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

    return new Promise(async (resolve, reject) => {
      try {
        // Use dynamic imports to avoid ES module restrictions
        const [PdfMake, pdfFonts] = await Promise.all([
          import('pdfmake/build/pdfmake'),
          import('pdfmake/build/vfs_fonts').catch(() => null)
        ]);
        
        // Get VFS fonts if available
        const vfs = pdfFonts && (pdfFonts as any).pdfMake?.vfs ? (pdfFonts as any).pdfMake.vfs : undefined;
        
        // Create PDF document with vfs parameter instead of mutating the import
        const pdfDoc = PdfMake.default.createPdf(docDefinition, undefined, undefined, vfs);
        
        pdfDoc.getBuffer((buffer: Buffer) => {
          resolve(buffer);
        });
      } catch (error) {
        console.warn('PDFMake initialization error:', error);
        reject(error);
      }
    });
  }


  private async createEmployeeSection(
    user: User,
    report: DailyReport,
    operations: Operation[],
    clientsMap: Map<string, Client>,
    workOrdersMap: Map<string, WorkOrder>
  ): Promise<Content> {
    
    const totalHours = operations.reduce((sum, op) => sum + Number(op.hours), 0);
    
    // Operations table
    const tableBody = [
      // Header
      [
        { text: 'Cliente', style: 'tableHeader' },
        { text: 'Commessa', style: 'tableHeader' },
        { text: 'Lavorazione', style: 'tableHeader' },
        { text: 'Ore', style: 'tableHeader' },
        { text: 'Note', style: 'tableHeader' }
      ]
    ];

    // Add operation rows
    operations.forEach(op => {
      const client = clientsMap.get(op.clientId);
      const workOrder = workOrdersMap.get(op.workOrderId);
      const hours = Number(op.hours);
      
      tableBody.push([
        { text: client?.name || 'N/A', style: 'tableCell' },
        { text: workOrder?.name || 'N/A', style: 'tableCell' },
        { text: op.workTypes.join(', '), style: 'tableCell' },
        { text: hours.toString() + 'h', style: 'tableCell' },
        { text: op.notes || '-', style: 'tableCell' }
      ]);
    });

    // Add total row
    tableBody.push([
      { text: '', style: 'tableCell' },
      { text: '', style: 'tableCell' },
      { text: 'TOTALE:', style: 'tableHeader' },
      { text: totalHours.toString() + 'h', style: 'tableHeader' },
      { text: '', style: 'tableCell' }
    ]);

    // Build stack content
    const stackContent: Content[] = [
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
    ];

    // Add photos for each operation that has them
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (op.photos && op.photos.length > 0) {
        const client = clientsMap.get(op.clientId);
        const workOrder = workOrdersMap.get(op.workOrderId);
        
        // Load photos in parallel with bounded concurrency
        const photoPromises = op.photos.map(photoPath => this.getPhotoAsBase64(photoPath, 200));
        const photoBase64Array = await Promise.all(photoPromises);
        
        // Build photo images array (filter out null values)
        const photoImages: any[] = photoBase64Array
          .filter(base64 => base64 !== null)
          .map(base64 => ({
            image: base64,
            width: 100,
            margin: [0, 0, 10, 0]
          }));

        if (photoImages.length > 0) {
          stackContent.push({
            stack: [
              {
                text: `Foto Operazione ${i + 1} - ${client?.name || 'N/A'} / ${workOrder?.name || 'N/A'}`,
                style: 'sectionHeader',
                margin: [0, 10, 0, 5]
              },
              {
                columns: photoImages,
                columnGap: 10
              }
            ],
            margin: [0, 5, 0, 10]
          });
        }
      }
    }

    return {
      stack: stackContent
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
    return formatDateToItalianLong(dateStr);
  }

  private async getPhotoAsBase64(photoPath: string, maxWidth: number = 200): Promise<string | null> {
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
        .toBuffer();
      
      // Convert to base64
      return `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
    } catch (error) {
      console.error(`Error loading photo ${photoPath}:`, error);
      return null;
    }
  }
}