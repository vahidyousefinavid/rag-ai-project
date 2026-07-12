import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ServiceRecord } from '../service-records/service-record.entity';
import { User } from '../users/user.entity';
import { InvoiceItem } from './invoice-item.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  serviceRecordId: string;

  @OneToOne(() => ServiceRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceRecordId' })
  serviceRecord: ServiceRecord;

  @Column({ nullable: true })
  createdByUserId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User;

  @Column({ type: 'real', default: 0 })
  discount: number;

  @Column({ type: 'real', default: 0 })
  paidAmount: number;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => InvoiceItem, (i) => i.invoice, { cascade: true })
  items: InvoiceItem[];

  @CreateDateColumn()
  createdAt: Date;
}
