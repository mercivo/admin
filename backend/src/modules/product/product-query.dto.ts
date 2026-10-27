import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { PageQueryDto } from '../../common/dto/page-query.dto';

export class ProductQueryDto extends PageQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsIn(['pending', 'published']) status?: string;
}

export class ProductExportQueryDto extends ProductQueryDto {
  @IsOptional()
  @Transform(({ value }) => String(value || '').trim().toUpperCase())
  @Matches(/^[A-Z]{3}$/)
  currency?: string = 'CNY';
}
