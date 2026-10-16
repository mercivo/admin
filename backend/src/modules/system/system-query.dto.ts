import { IsIn, IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from '../../common/dto/page-query.dto';

export class SystemListQueryDto extends PageQueryDto {
  @IsOptional() @IsString() @IsIn(['active', 'suspended']) status?: 'active' | 'suspended';
}
