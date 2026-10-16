import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTenantControlDto {
  @IsOptional() @IsIn(['active', 'suspended']) status?: 'active' | 'suspended';
  @IsOptional() @IsString() plan?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000000) maxProducts?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) maxMembers?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) maxWarehouses?: number;
  @IsOptional() @IsObject() features?: Record<string, boolean>;
  @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
  @IsOptional() @IsBoolean() permissionsCustomized?: boolean;
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class SavePlanDto {
  @IsString() name: string;
  @Type(() => Number) @IsNumber() @Min(0) price: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsIn(['month', 'year']) billingCycle?: 'month' | 'year';
  @IsOptional() @IsString() description?: string;
  @Type(() => Number) @IsInt() @Min(1) maxProducts: number;
  @Type(() => Number) @IsInt() @Min(1) maxMembers: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxWarehouses?: number;
  @IsOptional() @IsObject() features?: Record<string, boolean>;
  @IsArray() @IsString({ each: true }) permissions: string[];
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class SubscribePlanDto { @IsString() planId: string; }

export class CreateTenantDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: '请输入有效手机号' }) phone: string;
  @IsString() plan: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}
