import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatSession } from './chat-session.entity';
import { SiteModule } from '../site/site.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage, ChatSession]), SiteModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
