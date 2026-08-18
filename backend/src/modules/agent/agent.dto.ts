import { IsString, IsOptional, IsIn, IsInt, IsNumber, IsUUID, Min, Max, MaxLength } from 'class-validator';

export class InstallAgentPresetDto {
  @IsUUID() presetId: string;
}

export class CreateAgentDto {
  @IsString()
  @MaxLength(100)
  agentId: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsIn(['active', 'paused', 'draft'])
  status?: 'active' | 'paused' | 'draft';

  @IsString()
  @MaxLength(100)
  model: string;

  @IsString()
  @MaxLength(100)
  lang: string;

  @IsOptional()
  @IsIn(['sales', 'translation', 'sourcing'])
  agentType?: 'sales' | 'translation' | 'sourcing';

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  chats?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  leads?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  satisfaction?: number;

  @IsString()
  @MaxLength(100)
  icon: string;

  @IsString()
  @MaxLength(200)
  color: string;
}

export class UpdateAgentDto {
  @IsOptional()
  @IsIn(['sales', 'translation', 'sourcing'])
  agentType?: 'sales' | 'translation' | 'sourcing';

  @IsOptional()
  @IsString()
  systemPrompt?: string;
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['active', 'paused', 'draft'])
  status?: 'active' | 'paused' | 'draft';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lang?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  chats?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  leads?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  satisfaction?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  color?: string;
}
