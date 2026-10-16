import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class SalesOrderLineDto {
  @IsString() productId: string;
  @IsOptional() @IsString() variantKey?: string;
  @IsInt() @Min(1) quantity: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) unitPrice: number;
}

export class SalesOrderDto {
  @IsString() customerId: string;
  @IsString() warehouseId: string;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) discount?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) shippingFee?: number;
  @IsOptional() @IsDateString() deliveryDate?: string;
  @IsOptional() @IsString() @MaxLength(500) shippingAddress?: string;
  @IsOptional() @IsString() @MaxLength(80) contactName?: string;
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderLineDto)
  lines: SalesOrderLineDto[];
}

export class ShipmentLineDto {
  @IsString() orderLineId: string;
  @IsInt() @Min(1) quantity: number;
}

export class CreateShipmentDto {
  @IsString() orderId: string;
  @IsIn(["offline", "logistics"]) deliveryMethod: "offline" | "logistics";
  @IsOptional() @IsString() @MaxLength(100) logisticsCompany?: string;
  @IsOptional() @IsString() @MaxLength(100) trackingNo?: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentLineDto)
  lines: ShipmentLineDto[];
}
