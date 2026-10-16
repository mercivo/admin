import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 20, 50])
  pageSize?: number = 10;

  @IsOptional()
  @IsString()
  keyword?: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const pageResult = <T>(items: T[], total: number, query: PageQueryDto): PagedResult<T> => ({
  items,
  total,
  page: query.page || 1,
  pageSize: query.pageSize || 10,
});

export const pageLimit = (query: PageQueryDto) => query.pageSize || 10;
export const pageOffset = (query: PageQueryDto) => ((query.page || 1) - 1) * pageLimit(query);
