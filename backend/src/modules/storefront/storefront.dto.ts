import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';

export class CreateTestimonialDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
  company: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsString()
  @MaxLength(500)
  img: string;

  @IsString()
  @MaxLength(100)
  orders: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}

export class UpdateTestimonialDto {
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
  text?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  img?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  orders?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}