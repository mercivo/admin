import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";
import { PageQueryDto } from "../../common/dto/page-query.dto";

export class FinanceQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(["pending", "confirmed", "cancelled"]) status?: string;
  @IsOptional() @IsString() partnerId?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class FinanceStatisticsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2100)
  year?: number;
  @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/)
  currency?: string;
}
