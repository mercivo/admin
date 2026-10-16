import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsIn, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ANTD_LOCALE_CODES } from '../../common/constants/antd-locales';

export class UpdateConfigDto { @IsObject() value: Record<string, unknown>; }
export class UpdateAccountSettingsDto {
  @IsString() @MaxLength(255) enterpriseName: string;
  @IsOptional() @IsString() @MaxLength(255) memberName?: string;
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: '请输入有效手机号' }) phone: string;
  @IsOptional() @IsEmail() email?: string;
  @IsIn(['Asia/Shanghai']) timezone: 'Asia/Shanghai';
}
export class UpdateSiteInfoDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(2048) logoUrl?: string;
}
export class UpdateSiteLanguagesDto {
  @IsIn([...ANTD_LOCALE_CODES]) defaultLanguage: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(ANTD_LOCALE_CODES.length) @IsIn([...ANTD_LOCALE_CODES], { each: true }) supportedLanguages?: string[];
}
export class CreateTeamMemberDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsEmail() email?: string;
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: '请输入有效手机号' }) phone: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
  @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
  @IsOptional() @IsString() avatar?: string;
  @IsOptional() @IsString() color?: string;
}
export class UpdateTeamMemberDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @ValidateIf((_, value) => value !== '') @IsEmail() email?: string;
  @IsOptional() @Matches(/^\+?[1-9]\d{7,14}$/, { message: '请输入有效手机号' }) phone?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
}
