import { IsString, IsOptional, IsBoolean, IsNumber, IsIn, IsInt, IsArray, Min, MaxLength, ArrayMaxSize, ArrayMinSize, IsUUID } from 'class-validator';

export class BatchProductStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids: string[];

  @IsIn(['published', 'pending'])
  status: 'published' | 'pending';
}

export class CreateProductDto {
  @IsString()
  @MaxLength(255)
  nameZh: string;

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
  currencyPrices?: Record<string, { basePrice: number; levelPrices?: Record<string, number> }>;

  @IsOptional()
  @IsArray()
  variants?: Array<{ id?: string; specification: string; option: string; stock: number; surcharge: number; surcharges?: Record<string, number> }>;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsInt()
  @Min(0)
  moq: number;

  @IsOptional()
  @IsIn(['published', 'pending'])
  status?: 'published' | 'pending';

  @IsString()
  @MaxLength(100)
  category: string;

  @IsString()
  @MaxLength(500)
  img: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  images?: string[];

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

}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameZh?: string;

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
  currencyPrices?: Record<string, { basePrice: number; levelPrices?: Record<string, number> }>;

  @IsOptional()
  @IsArray()
  variants?: Array<{ id?: string; specification: string; option: string; stock: number; surcharge: number; surcharges?: Record<string, number> }>;

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
  @IsIn(['published', 'pending'])
  status?: 'published' | 'pending';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  img?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  images?: string[];

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

}
