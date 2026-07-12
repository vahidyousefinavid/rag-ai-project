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
  role: 'owner' | 'mechanic';

  @Column({ nullable: true })
  workshopName: string;

  @Column({ nullable: true })
  workshopAddress: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Vehicle, (v) => v.user)
  vehicles: Vehicle[];
}
