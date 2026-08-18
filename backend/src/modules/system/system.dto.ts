import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTenantControlDto {
  @IsOptional() @IsIn(['active', 'suspended']) status?: 'active' | 'suspended';
  @IsOptional() @IsString() plan?: string;
  @IsOptional() @IsInt() @Min(1) @Max(1000000) maxProducts?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000) maxAgents?: number;
  @IsOptional() @IsInt() @Min(1) @Max(10000) maxMembers?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1000) maxSites?: number;
  @IsOptional() @IsObject() features?: Record<string, boolean>;
  @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
  @IsOptional() @IsBoolean() permissionsCustomized?: boolean;
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class SavePlanDto {
  @IsString() code: string;
  @IsString() name: string;
  @Type(() => Number) @IsNumber() @Min(0) price: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsIn(['month', 'year']) billingCycle?: 'month' | 'year';
  @IsOptional() @IsString() description?: string;
  @Type(() => Number) @IsInt() @Min(1) maxProducts: number;
  @Type(() => Number) @IsInt() @Min(0) maxAgents: number;
  @Type(() => Number) @IsInt() @Min(1) maxMembers: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxSites?: number;
  @IsOptional() @IsObject() features?: Record<string, boolean>;
  @IsArray() @IsString({ each: true }) permissions: string[];
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class SubscribePlanDto { @IsString() planId: string; }

export class SaveAgentPresetDto {
  @IsString() @MaxLength(60) code: string;
  @IsString() @MaxLength(120) name: string;
  @IsString() description: string;
  @IsIn(['sales', 'translation', 'sourcing']) agentType: 'sales' | 'translation' | 'sourcing';
  @IsString() @MaxLength(100) model: string;
  @IsString() @MaxLength(100) lang: string;
  @IsOptional() @IsString() systemPrompt?: string;
  @IsOptional() @IsString() @MaxLength(100) icon?: string;
  @IsOptional() @IsString() @MaxLength(200) color?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}
