import { IsDateString, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
export class CreateOpportunityDto {
  @IsString() @MaxLength(255) company: string;
  @IsString() @MaxLength(255) contact: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsString() @MaxLength(255) product: string;
  @IsNumber() @Min(0) value: number;
  @IsInt() @Min(0) @Max(100) probability: number;
  @IsString() @MaxLength(100) owner: string;
  @IsOptional() @IsDateString() nextFollowUp?: string | null;
  @IsOptional() @IsIn(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']) stage?: string;
  @IsOptional() @IsString() @MaxLength(30) source?: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateOpportunityDto extends CreateOpportunityDto {}
