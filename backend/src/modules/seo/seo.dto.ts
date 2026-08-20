import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateSeoGlobalDto {
  @IsString()
  @MaxLength(255)
  siteName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleTemplate?: string;

  @IsOptional()
  @IsString()
  descriptionTemplate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultShareImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gaId?: string;

  @IsOptional()
  @IsString()
  gcVerification?: string;
}
