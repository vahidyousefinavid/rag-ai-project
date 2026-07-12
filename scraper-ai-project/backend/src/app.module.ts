import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { RagModule } from './rag/rag.module';
import { ChatModule } from './chat/chat.module';
import { MonitorModule } from './monitor/monitor.module';
import { User } from './database/entities/user.entity';
import { ChatSession } from './database/entities/chat-session.entity';
import { Message } from './database/entities/message.entity';
import { MonitorTarget } from './monitor/entities/monitor-target.entity';
import { MonitorRun } from './monitor/entities/monitor-run.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('postgres.host'),
        port: config.get<number>('postgres.port'),
        username: config.get<string>('postgres.username'),
        password: config.get<string>('postgres.password'),
        database: config.get<string>('postgres.database'),
        entities: [User, ChatSession, Message, MonitorTarget, MonitorRun],
        synchronize: true,
        logging: false,
      }),
    }),
    RagModule,
    ChatModule,
    MonitorModule,
  ],
})
export class AppModule {}
