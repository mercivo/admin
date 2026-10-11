import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductCategoryDto {
  @IsString() @MaxLength(255) label: string;
  @IsOptional() @IsInt() @Min(0) sort?: number;
  @IsOptional() @IsIn(['enabled', 'disabled']) status?: 'enabled' | 'disabled';
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
  @IsOptional() @IsString() @MaxLength(100) parentCode?: string | null;
}

export class UpdateProductCategoryDto {
  @IsOptional() @IsString() @MaxLength(255) label?: string;
  @IsOptional() @IsInt() @Min(0) sort?: number;
  @IsOptional() @IsIn(['enabled', 'disabled']) status?: 'enabled' | 'disabled';
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}
