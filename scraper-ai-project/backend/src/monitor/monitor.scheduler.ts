import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MonitorService } from './monitor.service';

@Injectable()
export class MonitorScheduler {
  private readonly logger = new Logger(MonitorScheduler.name);
  private ticking = false;

  constructor(private monitor: MonitorService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.ticking) return; // a previous tick's crawls are still running
    this.ticking = true;
    try {
      const due = await this.monitor.dueTargets();
      for (const target of due) {
        await this.monitor.runCheck(target.id);
      }
    } catch (err: any) {
      this.logger.error(`Scheduler tick failed: ${err.message}`);
    } finally {
      this.ticking = false;
    }
  }
}
