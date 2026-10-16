import { IsIn, IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from '../../common/dto/page-query.dto';

export class ProductQueryDto extends PageQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsIn(['pending', 'published']) status?: string;
}
