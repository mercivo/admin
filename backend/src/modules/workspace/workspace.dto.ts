import { IsArray, IsEmail, IsIn, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateConfigDto { @IsObject() value: Record<string, unknown>; }
export class UpdateAccountSettingsDto {
  @IsString() @MaxLength(255) enterpriseName: string;
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: '请输入有效手机号' }) phone: string;
  @IsOptional() @IsEmail() email?: string;
  @IsIn(['Asia/Shanghai']) timezone: 'Asia/Shanghai';
}
export class UpdateSiteSettingsDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsIn(['zh', 'en']) defaultLanguage: string;
  @IsIn(['USD', 'EUR', 'CNY']) defaultCurrency: string;
}
export class CreateTeamMemberDto {
  @IsString() @MaxLength(255) name: string;
  @IsEmail() email: string;
  @IsIn(['admin', 'editor', 'viewer']) role: 'admin' | 'editor' | 'viewer';
  @IsString() @MinLength(6) @MaxLength(72) password: string;
  @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
  @IsOptional() @IsString() avatar?: string;
  @IsOptional() @IsString() color?: string;
}
export class UpdateTeamMemberDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(['admin', 'editor', 'viewer']) role?: 'admin' | 'editor' | 'viewer';
  @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
}
export class CreateKnowledgeFileDto {
  @IsString() @MaxLength(255) name: string;
  @IsString() @MaxLength(30) type: string;
  @IsString() @MaxLength(30) size: string;
  @IsString() @MaxLength(500000) content: string;
}
