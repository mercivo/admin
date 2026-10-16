import { IsOptional, IsString } from "class-validator";
import { PageQueryDto } from "../../common/dto/page-query.dto";
export class PurchaseQueryDto extends PageQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() warehouseId?: string;
}
