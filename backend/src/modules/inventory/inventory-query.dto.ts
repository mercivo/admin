import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from '../../common/dto/page-query.dto';

export class InventoryListQueryDto extends PageQueryDto {
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() variantKey?: string;
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
