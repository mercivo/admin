import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class WarehouseDto {
  @IsString() @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(80) contact?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsIn(['active', 'disabled']) status?: 'active' | 'disabled';
}

export class CountLineDto {
  @IsString() productId: string;
  @IsOptional() @IsString() variantKey?: string;
  @IsOptional() @IsInt() @Min(0) countedQuantity?: number;
}

export class CreateCountDto {
  @IsString() warehouseId: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CountLineDto) lines?: CountLineDto[];
}

export class UpdateCountDto {
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CountLineDto) lines: CountLineDto[];
}

export class TransferLineDto {
  @IsString() productId: string;
  @IsOptional() @IsString() variantKey?: string;
  @IsInt() @Min(1) quantity: number;
}

export class CreateTransferDto {
  @IsString() sourceWarehouseId: string;
  @IsString() destinationWarehouseId: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => TransferLineDto) lines: TransferLineDto[];
}
