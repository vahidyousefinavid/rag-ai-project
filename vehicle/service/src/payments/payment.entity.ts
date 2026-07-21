import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from '../invoices/invoice.entity';

export type PaymentStatus = 'pending' | 'success' | 'failed';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() invoiceId: string;
  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' }) invoice: Invoice;

  @Column() vehicleId: string;
  @Column() recordId: string;

  @Column({ type: 'real' }) amount: number;
  @Column({ nullable: true }) authority: string;
  @Column({ nullable: true }) refId: string;
  @Column({ default: 'pending' }) status: PaymentStatus;

  @CreateDateColumn() createdAt: Date;
}
