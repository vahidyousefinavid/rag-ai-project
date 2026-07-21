import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { RagModule } from './rag/rag.module';
import { ChatModule } from './chat/chat.module';
import { CrmModule } from './crm/crm.module';
import { SourcesModule } from './sources/sources.module';
import { User } from './database/entities/user.entity';
import { ChatSession } from './database/entities/chat-session.entity';
import { Message } from './database/entities/message.entity';
import { RagSource } from './sources/entities/source.entity';
import { SourceProfile } from './sources/entities/source-profile.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('postgres.host'),
        port: config.get<number>('postgres.port'),
        username: config.get<string>('postgres.username'),
        password: config.get<string>('postgres.password'),
        database: config.get<string>('postgres.database'),
        entities: [User, ChatSession, Message, RagSource, SourceProfile],
        synchronize: true,
        logging: false,
      }),
    }),
    RagModule,
    ChatModule,
    CrmModule,
    SourcesModule,
  ],
})
export class AppModule {}
