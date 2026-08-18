import { IsString, IsOptional, IsIn, IsInt, Min, Max, MaxLength } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
  company: string;

  @IsString()
  @MaxLength(255)
  email: string;

  @IsString()
  @MaxLength(50)
  phone: string;

  @IsString()
  @MaxLength(100)
  country: string;

  @IsString()
  @MaxLength(255)
  product: string;

  @IsString()
  summary: string;

  @IsOptional()
  @IsIn(['new', 'contacted', 'converted'])
  status?: 'new' | 'contacted' | 'converted';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @IsString()
  @MaxLength(100)
  tag: string;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  product?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsIn(['new', 'contacted', 'converted'])
  status?: 'new' | 'contacted' | 'converted';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  assignedTo?: string;
}
