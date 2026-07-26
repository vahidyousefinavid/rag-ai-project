import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phone: string;

  @Column()
  name: string;

  @Column({ default: 'owner' })
  role: 'owner' | 'mechanic' | 'admin' | 'seller';

  @Column({ nullable: true })
  password: string;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  workshopName: string;

  @Column({ nullable: true })
  workshopAddress: string;

  @Column({ type: 'double precision', nullable: true })
  workshopLat: number;

  @Column({ type: 'double precision', nullable: true })
  workshopLng: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Vehicle, (v) => v.user)
  vehicles: Vehicle[];
}
