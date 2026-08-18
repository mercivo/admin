import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOutreachCampaignDto {
  @IsString() @MaxLength(160) name: string;
  @IsIn(['customers', 'leads']) audienceType: 'customers' | 'leads';
  @IsOptional() @IsString() @MaxLength(160) audienceLabel?: string;
  @IsString() @MaxLength(255) subject: string;
  @IsString() content: string;
}

export class UpdateOutreachCampaignDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsIn(['customers', 'leads']) audienceType?: 'customers' | 'leads';
  @IsOptional() @IsString() @MaxLength(160) audienceLabel?: string;
  @IsOptional() @IsString() @MaxLength(255) subject?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsIn(['draft', 'paused']) status?: 'draft' | 'paused';
}

export class ScheduleOutreachCampaignDto {
  @Type(() => Date) @IsDate() scheduledAt: Date;
}
