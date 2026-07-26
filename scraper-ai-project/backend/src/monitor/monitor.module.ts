import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitorTarget } from './entities/monitor-target.entity';
import { MonitorRun } from './entities/monitor-run.entity';
import { MonitorService } from './monitor.service';
import { MonitorController } from './monitor.controller';
import { MonitorScheduler } from './monitor.scheduler';
import { CrawlerService } from './crawler.service';
import { MonitorWizardService } from './monitor-wizard.service';
import { DbSinkService } from './db-sink.service';
import { NotifyService } from './notify/notify.service';
import { EmailService } from './notify/email.service';
import { TelegramService } from './notify/telegram.service';
import { WebhookService } from './notify/webhook.service';
import { SmsService } from './notify/sms.service';
import { VectorService } from '../vector/vector.service';
import { RedisService } from '../cache/redis.service';
import { OllamaService } from '../llm/ollama.service';

@Module({
  imports: [TypeOrmModule.forFeature([MonitorTarget, MonitorRun])],
  controllers: [MonitorController],
  providers: [
    MonitorService,
    MonitorScheduler,
    CrawlerService,
    MonitorWizardService,
    DbSinkService,
    NotifyService,
    EmailService,
    TelegramService,
    WebhookService,
    SmsService,
    VectorService,
    RedisService,
    OllamaService,
  ],
  exports: [MonitorService],
})
export class MonitorModule {}
