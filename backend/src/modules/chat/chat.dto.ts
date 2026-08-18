import { IsString, IsOptional, IsIn, IsObject, IsBoolean, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MaxLength(100)
  sessionId: string;

  @IsString()
  text: string;
}

export class SendPublicMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  sessionId?: string;

  @IsString()
  @MaxLength(100)
  visitorId: string;

  @IsString()
  @MaxLength(4000)
  text: string;
}

export class ChatProductData {
  @IsString()
  name: string;

  @IsString()
  price: string;

  @IsString()
  img: string;
}

export class CreateMessageDto {
  @IsString()
  @MaxLength(100)
  sessionId: string;

  @IsIn(['system', 'user', 'ai', 'product', 'confirm', 'form'])
  type: 'system' | 'user' | 'ai' | 'product' | 'confirm' | 'form';

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsObject()
  productData?: { name: string; price: string; img: string };
}
export class UpdateSessionDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsBoolean() starred?: boolean;
}
