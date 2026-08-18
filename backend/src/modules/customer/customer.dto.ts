import { IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, ValidateIf } from 'class-validator';

export class CreateCustomerDto {
  @IsString() @MaxLength(255) name: string;
  @IsString() @MaxLength(255) company: string;
  @ValidateIf((_, value) => value !== undefined && value !== '') @IsEmail() @MaxLength(255) email?: string;
  @Matches(/^\+?[0-9\s()-]{6,24}$/, { message: '请输入有效手机号' }) phone: string;
  @IsOptional() @IsIn(['active', 'disabled']) status?: 'active' | 'disabled';
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(36) level?: string;
  @IsOptional() @IsInt() @Min(0) orders?: number;
  @IsOptional() @IsNumber() @Min(0) totalAmount?: number;
  @IsOptional() @IsString() lastOrderAt?: string | null;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateCustomerDto extends CreateCustomerDto {}
export class UpdateGuestPricingDto {
  @IsIn(['base', 'hidden']) mode: 'base' | 'hidden';
}
export class PublicCustomerLoginDto {
  @Matches(/^\+?[0-9\s()-]{6,24}$/, { message: '请输入有效手机号' }) phone: string;
}
export class CreateCustomerLevelDto {
  @IsString() @MaxLength(50) name: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class UpdateCustomerLevelDto extends CreateCustomerLevelDto {}
