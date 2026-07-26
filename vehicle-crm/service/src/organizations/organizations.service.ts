import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './organization.entity';
import { OrganizationMember } from './organization-member.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization) private orgs: Repository<Organization>,
    @InjectRepository(OrganizationMember) private members: Repository<OrganizationMember>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
  ) {}

  async list(params: { page: number; pageSize: number }) {
    const [rows, total] = await this.orgs.findAndCount({
      relations: ['owner'],
      order: { createdAt: 'DESC' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });

    const items = await Promise.all(
      rows.map(async (o) => ({
        id: o.id, name: o.name, createdAt: o.createdAt, ownerName: o.owner?.name,
        memberCount: await this.members.count({ where: { organizationId: o.id } }),
        vehicleCount: await this.vehicles.count({ where: { organizationId: o.id } }),
      })),
    );

    return { total, page: params.page, pageSize: params.pageSize, items };
  }
}
