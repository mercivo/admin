import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { SendMessageDto, SendPublicMessageDto, CreateMessageDto } from './chat.dto';
import { ChatSession } from './chat-session.entity';
import { SiteService } from '../site/site.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatSession) private readonly sessionRepository: Repository<ChatSession>,
    private readonly siteService: SiteService,
  ) {}

  listSessions(siteId: string) { return this.sessionRepository.find({ where: { siteId }, order: { updatedAt: 'DESC' } }); }
  createSession(tenantId: string, siteId: string) { return this.sessionRepository.save(this.sessionRepository.create({ title: '新对话', tenantId, siteId })); }
  async updateSession(id: string, data: { title?: string; starred?: boolean }, siteId: string) {
    const session = await this.sessionRepository.findOneByOrFail({ id, siteId });
    return this.sessionRepository.save(Object.assign(session, data));
  }
  async deleteSession(id: string, siteId: string) { await this.sessionRepository.findOneByOrFail({ id, siteId }); await this.chatMessageRepository.delete({ sessionId: id }); await this.sessionRepository.delete({ id, siteId }); }
  async clearSession(id: string, siteId: string) { await this.sessionRepository.findOneByOrFail({ id, siteId }); await this.chatMessageRepository.delete({ sessionId: id }); }

  async getMessages(sessionId: string, siteId: string): Promise<ChatMessage[]> {
    await this.sessionRepository.findOneByOrFail({ id: sessionId, siteId });
    return this.chatMessageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async sendMessage(dto: SendMessageDto, siteId: string): Promise<ChatMessage> {
    const session = await this.sessionRepository.findOne({ where: { id: dto.sessionId, siteId } });
    if (!session) throw new NotFoundException('Chat session not found');
    return this.persistReply(session.id, dto.text);
  }

  async sendPublicMessage(hostname: string, siteSlug: string | undefined, dto: SendPublicMessageDto): Promise<{ sessionId: string; message: ChatMessage }> {
    const site = await this.siteService.resolvePublicSite(hostname, siteSlug);
    let session = dto.sessionId ? await this.sessionRepository.findOne({ where: { id: dto.sessionId, siteId: site.id, visitorId: dto.visitorId } }) : null;
    if (!session) {
      session = await this.sessionRepository.findOne({ where: { siteId: site.id, visitorId: dto.visitorId } });
    }
    if (!session) {
      session = await this.sessionRepository.save(this.sessionRepository.create({ tenantId: site.tenantId, siteId: site.id, visitorId: dto.visitorId, title: '公开站访客会话' }));
    }
    return { sessionId: session.id, message: await this.persistReply(session.id, dto.text) };
  }

  private async persistReply(sessionId: string, text: string): Promise<ChatMessage> {
    const userMsg = this.chatMessageRepository.create({
      sessionId,
      type: 'user',
      text,
    });
    await this.chatMessageRepository.save(userMsg);

    // 简单的AI回复逻辑
    const aiReply = this.generateAiReply(text);
    const aiMsg = this.chatMessageRepository.create({
      sessionId,
      type: aiReply.type,
      text: aiReply.text,
      productData: aiReply.productData,
    });
    await this.chatMessageRepository.save(aiMsg);

    return aiMsg;
  }

  async createMessage(dto: CreateMessageDto): Promise<ChatMessage> {
    return this.chatMessageRepository.save(dto);
  }

  private generateAiReply(text: string): {
    type: 'ai' | 'product' | 'confirm' | 'form';
    text?: string;
    productData?: { name: string; price: string; img: string };
  } {
    const lower = text.toLowerCase();
    if (lower.includes('moq') || lower.includes('minimum') || lower.includes('起订量')) {
      return {
        type: 'ai',
        text: 'Great question! Our minimum order quantities are:\n• Eco Shopping Bags: 500 pcs\n• Cotton Tote Bags: 300 pcs\n• Drawstring Bags: 1,000 pcs\n\nWould you like me to prepare a custom quotation?',
      };
    }
    if (lower.includes('quote') || lower.includes('报价') || lower.includes('price') || lower.includes('价格')) {
      return {
        type: 'form',
        text: "I'd be happy to prepare a custom quotation! Please share your requirements.",
      };
    }
    if (lower.includes('shipping') || lower.includes('delivery') || lower.includes('运输')) {
      return {
        type: 'ai',
        text: 'We ship worldwide! Estimated timelines:\n• Sea Freight: 20-35 days\n• Air Freight: 5-8 days\n• Express DHL/FedEx: 3-5 days',
      };
    }
    return {
      type: 'ai',
      text: "Thanks for reaching out! Our eco bags are made from 100% recyclable materials with custom branding options.\n\nWhat specific product or quantity are you looking for?",
    };
  }
}
