import { IsString, IsOptional, IsArray, IsEnum, MaxLength } from 'class-validator';
import { PageType } from './page-override.entity';

export class UpsertPageOverrideDto {
  @IsEnum(PageType)
  pageType: PageType;

  @IsOptional()
  @IsString()
  pageId?: string;

  @IsString()
  @MaxLength(10)
  language: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  socialTitle?: string;

  @IsOptional()
  @IsString()
  socialDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  socialImage?: string;
}