import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ServiceRecord } from '../service-records/service-record.entity';

export interface InvoicePdfData {
  createdAt: Date | string;
  discount: number;
  paidAmount: number;
  notes?: string | null;
  subtotal: number;
  total: number;
  items: { type: 'part' | 'labor'; name: string; quantity: number; unitPrice: number }[];
}

function buffer(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    build(doc);
    doc.end();
  });
}

function money(n: number) {
  return `${Math.round(n).toLocaleString('en-US')} Toman`;
}

@Injectable()
export class PdfService {
  invoicePdf(vehicle: Vehicle, record: ServiceRecord, invoice: InvoicePdfData) {
    return buffer((doc) => {
      doc.fontSize(18).text('Service Invoice', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).fillColor('#555').text(`Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.year})`);
      if (vehicle.plateNumber) doc.text(`Plate: ${vehicle.plateNumber}`);
      doc.text(`Service: ${record.serviceType} — ${record.serviceDate}`);
      if (record.workshop) doc.text(`Workshop: ${record.workshop}`);
      doc.text(`Issued: ${new Date(invoice.createdAt).toISOString().slice(0, 10)}`);
      doc.moveDown();

      doc.fillColor('#000').fontSize(12).text('Items', { underline: true });
      doc.moveDown(0.5);
      (invoice.items || []).forEach((it) => {
        doc.fontSize(10).text(
          `${it.type === 'part' ? '[Part] ' : '[Labor] '}${it.name}  x${it.quantity}  @ ${money(it.unitPrice)}  =  ${money(it.quantity * it.unitPrice)}`,
        );
      });

      doc.moveDown();
      doc.fontSize(10).text(`Subtotal: ${money(invoice.subtotal)}`);
      if (invoice.discount) doc.text(`Discount: -${money(invoice.discount)}`);
      doc.fontSize(12).text(`Total: ${money(invoice.total)}`, { underline: true });
      doc.fontSize(10).text(`Paid: ${money(invoice.paidAmount)}`);
      if (invoice.notes) {
        doc.moveDown();
        doc.text(`Notes: ${invoice.notes}`);
      }
    });
  }

  historyPdf(vehicle: Vehicle, records: ServiceRecord[]) {
    return buffer((doc) => {
      doc.fontSize(18).text('Vehicle Service History', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).fillColor('#555').text(`Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.year})`);
      if (vehicle.plateNumber) doc.text(`Plate: ${vehicle.plateNumber}`);
      if (vehicle.vin) doc.text(`VIN: ${vehicle.vin}`);
      doc.text(`Current mileage: ${vehicle.currentMileage?.toLocaleString('en-US')} km`);
      doc.moveDown();

      doc.fillColor('#000').fontSize(12).text(`Service records (${records.length})`, { underline: true });
      doc.moveDown(0.5);

      records.forEach((r) => {
        doc.fontSize(11).text(`${r.serviceDate} — ${r.serviceType} (${r.mileage?.toLocaleString('en-US')} km)`);
        if (r.workshop) doc.fontSize(9).fillColor('#555').text(`Workshop: ${r.workshop}`);
        if (r.description) doc.fontSize(9).fillColor('#555').text(r.description);
        if (r.cost) doc.fontSize(9).fillColor('#555').text(`Cost: ${money(r.cost)}`);
        doc.fillColor('#000').moveDown(0.6);
      });
    });
  }
}
