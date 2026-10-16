import { IsEmail, IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, ValidateIf } from 'class-validator';

export class CreateCustomerDto {
  @IsString() @MaxLength(255) name: string;
  @ValidateIf((_, value) => value !== undefined && value !== '') @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @ValidateIf((_, value) => value !== '') @Matches(/^\+?[0-9\s()-]{6,24}$/, { message: '请输入有效手机号' }) phone?: string;
  @IsOptional() @IsIn(['active', 'disabled']) status?: 'active' | 'disabled';
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(36) level?: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateCustomerDto extends CreateCustomerDto {}
export class UpdateGuestPricingDto {
  @IsIn(['base', 'hidden', 'percentage']) mode: 'base' | 'hidden' | 'percentage';
}
export class CreateCustomerLevelDto {
  @IsString() @MaxLength(50) name: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) discountRate?: number | null;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class UpdateCustomerLevelDto extends CreateCustomerLevelDto {}
