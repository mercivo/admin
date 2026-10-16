import { IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ANTD_LOCALE_CODES } from '../../common/constants/antd-locales';

export class TranslationQueryDto {
  @IsOptional() @IsIn([...ANTD_LOCALE_CODES]) locale?: string;
  @IsOptional() @IsString() resourceType?: string;
  @IsOptional() @IsIn(['missing', 'completed', 'stale']) status?: 'missing' | 'completed' | 'stale';
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() page?: number;
  @IsOptional() pageSize?: number;
}

export class SaveTranslationItemDto {
  @IsString() @MaxLength(255) key: string;
  @IsString() value: string;
}

export class SaveTranslationsDto {
  @IsIn([...ANTD_LOCALE_CODES]) locale: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => SaveTranslationItemDto) items: SaveTranslationItemDto[];
}

export class CommitTranslationImportDto {
  @IsUUID() token: string;
}
