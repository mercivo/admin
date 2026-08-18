import { IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString() @MaxLength(80) account: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
}

export class RegisterDto {
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: '请输入有效手机号' }) phone: string;
  @IsString() @MinLength(8) @MaxLength(72) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, { message: '密码必须包含大小写字母、数字和特殊字符' }) password: string;
  @IsString() @MinLength(2) @MaxLength(80) tenantName: string;
  @IsString() captchaId: string;
  @IsString() @MinLength(4) @MaxLength(6) captchaCode: string;
}

export class SwitchSiteDto {
  @IsUUID()
  siteId: string;
}
