import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MechanicService } from './mechanic-service.entity';

export interface UpsertMechanicServiceInput {
  serviceType: string;
  customName?: string;
  price?: number;
  supportsInShop?: boolean;
  supportsOnSite?: boolean;
}

@Injectable()
export class MechanicServicesService {
  constructor(@InjectRepository(MechanicService) private repo: Repository<MechanicService>) {}

  list(mechanicId: string) {
    return this.repo.find({ where: { mechanicId }, order: { createdAt: 'ASC' } });
  }

  async create(mechanicId: string, dto: UpsertMechanicServiceInput) {
    this.validate(dto);
    if (dto.serviceType !== 'سایر') {
      const existing = await this.repo.findOne({ where: { mechanicId, serviceType: dto.serviceType } });
      if (existing) throw new BadRequestException('این خدمت قبلاً ثبت شده؛ می‌تونی ویرایشش کنی');
    }
    return this.repo.save(this.repo.create({ ...dto, mechanicId }));
  }

  async update(id: string, mechanicId: string, dto: Partial<UpsertMechanicServiceInput>) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException();
    if (row.mechanicId !== mechanicId) throw new ForbiddenException();
    this.validate({ ...row, ...dto });
    Object.assign(row, dto);
    return this.repo.save(row);
  }

  async remove(id: string, mechanicId: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException();
    if (row.mechanicId !== mechanicId) throw new ForbiddenException();
    await this.repo.remove(row);
  }

  private validate(dto: { supportsInShop?: boolean; supportsOnSite?: boolean }) {
    if (dto.supportsInShop === false && dto.supportsOnSite === false) {
      throw new BadRequestException('حداقل یکی از حالت‌های «حضوری» یا «در محل» باید فعال باشد');
    }
  }
}
