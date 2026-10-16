import { IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from '../../common/dto/page-query.dto';

export class SalesQueryDto extends PageQueryDto {
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() status?: string;
}
