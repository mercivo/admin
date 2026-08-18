import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateSiteDto {
  @IsOptional() @IsString() tenantId?: string;
  @IsString() @MaxLength(120) slug: string;
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() defaultLanguage?: string;
  @IsOptional() @IsString() defaultCurrency?: string;
}
export class UpdateSiteDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() defaultLanguage?: string;
  @IsOptional() @IsString() defaultCurrency?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12) @IsString({ each: true }) supportedLanguages?: string[];
  @IsOptional() @IsUUID() translationAgentId?: string | null;
}
export class TranslatePublishedSiteDto { @IsString() @MaxLength(10) language: string; }
export class CreateDomainDto {
  @IsString() hostname: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}
export class PublishSiteDto { @IsOptional() @IsString() publishedBy?: string; }
export class RollbackSiteDto { @IsString() versionId: string; }

export class CreatePublicInquiryDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(255) name?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(255) company?: string;
  @IsOptional() @IsString() @MaxLength(100) phone?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MinLength(5) @MaxLength(5000) requirements?: string;
  @IsOptional() @IsString() @MaxLength(0) website?: string;
}
