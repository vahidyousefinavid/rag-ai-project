import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invoiceId: string;

  @ManyToOne(() => Invoice, (i) => i.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column()
  type: 'part' | 'labor';

  @Column()
  name: string;

  @Column({ type: 'real', default: 1 })
  quantity: number;

  @Column({ type: 'real' })
  unitPrice: number;
}
