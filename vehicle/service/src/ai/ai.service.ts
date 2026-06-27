import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ServiceRecord } from '../service-records/service-record.entity';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:7998';
const LLM_MODEL  = process.env.OLLAMA_LLM_MODEL  || 'llama3.1';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(Vehicle)       private vehicles: Repository<Vehicle>,
    @InjectRepository(ServiceRecord) private records:  Repository<ServiceRecord>,
  ) {}

  async ask(vehicleId: string, userId: string, question: string) {
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException();
    if (vehicle.userId !== userId) throw new ForbiddenException();

    const history = await this.records.find({
      where: { vehicleId },
      order: { serviceDate: 'DESC' },
    });

    const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model} | پلاک: ${vehicle.plateNumber || 'نامشخص'} | رنگ: ${vehicle.color || 'نامشخص'} | کارکرد فعلی: ${vehicle.currentMileage?.toLocaleString()} کیلومتر`;

    const recordsSummary = history.length
      ? history.map(r =>
          `- ${r.serviceDate}: ${r.serviceType} در کارکرد ${r.mileage?.toLocaleString()} کیلومتر` +
          (r.description ? ` (${r.description})` : '') +
          (r.cost ? ` | هزینه: ${r.cost?.toLocaleString()} تومان` : '') +
          (r.nextServiceMileage ? ` | سرویس بعدی: ${r.nextServiceMileage?.toLocaleString()} کیلومتر` : '')
        ).join('\n')
      : 'هیچ سرویسی ثبت نشده';

    const prompt = `تو یک دستیار هوشمند خودرو هستی که به زبان فارسی پاسخ می‌دهی.

اطلاعات خودرو:
${vehicleInfo}

تاریخچه سرویس:
${recordsSummary}

سوال کاربر: ${question}

پاسخ دقیق، مفید و فارسی بده. اگر اطلاعات کافی نداری صادقانه بگو.`;

    const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: LLM_MODEL, prompt, stream: false }),
    });

    if (!resp.ok) throw new Error('Ollama error');
    const data = await resp.json();
    return { answer: data.response };
  }
}
