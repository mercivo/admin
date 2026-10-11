import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
export class CreateDomainDto {
  @IsString() hostname: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}
export class PublishSiteDto { @IsOptional() @IsString() publishedBy?: string; }
export class RollbackSiteDto { @IsString() versionId: string; }
