import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { MusicSearchModule } from './music-search/music-search.module';
import { AiModule } from './ai/ai.module';
import { LibraryModule } from './library/library.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { User } from './users/user.entity';
import { Track } from './library/track.entity';
import { Playlist } from './playlists/playlist.entity';
import { PlaylistTrack } from './playlists/playlist-track.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host:     process.env.POSTGRES_HOST     || 'localhost',
      port:     Number(process.env.POSTGRES_PORT) || 5432,
      username: process.env.POSTGRES_USER     || 'rag_user',
      password: process.env.POSTGRES_PASSWORD || 'rag_password',
      database: process.env.POSTGRES_DB       || 'music_db',
      entities: [User, Track, Playlist, PlaylistTrack],
      synchronize: true,
    }),
    AuthModule,
    MusicSearchModule,
    AiModule,
    LibraryModule,
    PlaylistsModule,
  ],
})
export class AppModule {}
