import { IsString, IsOptional, MaxLength, IsIn, Matches, ValidateIf } from 'class-validator';
import { PageQueryDto } from '../../common/dto/page-query.dto';

export class CreateInquiryLeadDto {
  @IsOptional() @IsIn(['inquiry', 'sample', 'contact']) type?: 'inquiry' | 'sample' | 'contact';
  @IsString() @Matches(/\S/, { message: '联系人不能为空' }) @MaxLength(120) name: string;
  @ValidateIf(value => !value.email && !value.phone) @IsString() @Matches(/\S/, { message: '联系方式不能为空' }) @MaxLength(160) contact?: string;
  @IsOptional() @IsString() @MaxLength(160) email?: string;
  @IsOptional() @IsString() @MaxLength(160) company?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(36) productId?: string;
  @IsOptional() @IsString() @MaxLength(255) productName?: string;
  @IsOptional() @IsString() @MaxLength(500) sourcePage?: string;
  @IsString() @Matches(/\S/, { message: '采购需求不能为空' }) @MaxLength(5000) requirements: string;
}

export class InquiryLeadQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(['new', 'following', 'converted', 'closed']) status?: string;
}

export class StorefrontProductQueryDto extends PageQueryDto {
  @IsOptional() @IsString() category?: string;
}

export class UpdateInquiryLeadDto {
  @IsIn(['new', 'following', 'converted', 'closed']) status: 'new' | 'following' | 'converted' | 'closed';
  @IsOptional() @IsString() @MaxLength(5000) note?: string;
  @IsOptional() @IsString() @MaxLength(36) assigneeUserId?: string;
  @IsOptional() @IsString() @MaxLength(2000) closeReason?: string;
}
