import { IsIn, IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from '../../common/dto/page-query.dto';

export class CustomerQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(['active', 'disabled']) status?: string;
  @IsOptional() @IsString() level?: string;
}
