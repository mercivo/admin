import { IsString, IsOptional, IsBoolean, IsNumber, IsIn, IsInt, IsArray, Min, Max, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MaxLength(255)
  nameZh: string;

  @IsString()
  @MaxLength(255)
  nameEn: string;

  @IsString()
  @MaxLength(100)
  sku: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  price?: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  levelPrices?: Record<string, number>;

  @IsOptional()
  @IsArray()
  variants?: Array<{ specification: string; option: string; stock: number; surcharge: number }>;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsInt()
  @Min(0)
  stock: number;

  @IsInt()
  @Min(0)
  moq: number;

  @IsOptional()
  @IsIn(['published', 'draft'])
  status?: 'published' | 'draft';

  @IsString()
  @MaxLength(100)
  category: string;

  @IsString()
  @MaxLength(500)
  img: string;

  @IsOptional()
  @IsBoolean()
  hot?: boolean;

  @IsOptional()
  @IsIn(['', 'new', 'hot', 'bestseller', 'recommended'])
  badge?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  likeCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gtin?: string;

  @IsOptional()
  @IsBoolean()
  enableReviews?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  reviewRating?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  price?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  levelPrices?: Record<string, number>;

  @IsOptional()
  @IsArray()
  variants?: Array<{ specification: string; option: string; stock: number; surcharge: number }>;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  moq?: number;

  @IsOptional()
  @IsIn(['published', 'draft'])
  status?: 'published' | 'draft';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  img?: string;

  @IsOptional()
  @IsBoolean()
  hot?: boolean;

  @IsOptional()
  @IsIn(['', 'new', 'hot', 'bestseller', 'recommended'])
  badge?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  likeCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gtin?: string;

  @IsOptional()
  @IsBoolean()
  enableReviews?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  reviewRating?: number;
}

export class UpdateProductSeoDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gtin?: string;

  @IsOptional()
  @IsBoolean()
  enableReviews?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  reviewRating?: number;
}
