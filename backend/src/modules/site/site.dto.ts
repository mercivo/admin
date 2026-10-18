import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ANTD_LOCALE_CODES } from '../../common/constants/antd-locales';
import { PageQueryDto } from '../../common/dto/page-query.dto';

export class CreateSiteDto {
  @IsOptional() @IsString() tenantId?: string;
  @IsString() @MaxLength(120) slug: string;
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsIn([...ANTD_LOCALE_CODES]) defaultLanguage?: string;
  @IsOptional() @IsString() defaultCurrency?: string;
}
export class UpdateSiteDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn([...ANTD_LOCALE_CODES]) defaultLanguage?: string;
  @IsOptional() @IsString() defaultCurrency?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(ANTD_LOCALE_CODES.length) @IsIn([...ANTD_LOCALE_CODES], { each: true }) supportedLanguages?: string[];
}
export class CreateDomainDto {
  @IsString() hostname: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}
export class PublishSiteDto { @IsString() @MaxLength(1000) releaseNote: string; }
export class RollbackSiteDto { @IsString() versionId: string; }
export class SiteVersionQueryDto extends PageQueryDto {}
