import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class SupplierDto {
  @IsString() @MaxLength(160) name: string;
  @IsOptional() @IsString() @MaxLength(80) contact?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ValidateIf((_, value) => value !== undefined && value !== "")
  @IsEmail()
  @MaxLength(160)
  email?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsIn(["active", "disabled"]) status?: "active" | "disabled";
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}

export class PurchaseOrderLineDto {
  @IsString() productId: string;
  @IsOptional() @IsString() variantKey?: string;
  @IsInt() @Min(1) quantity: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) unitPrice: number;
}
export class PurchaseOrderDto {
  @IsString() supplierId: string;
  @IsString() warehouseId: string;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) taxAmount?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) shippingFee?: number;
  @IsOptional() @IsDateString() expectedDate?: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines: PurchaseOrderLineDto[];
}
export class PurchaseReceiptLineDto {
  @IsString() orderLineId: string;
  @IsInt() @Min(1) quantity: number;
}
export class CreatePurchaseReceiptDto {
  @IsString() orderId: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseReceiptLineDto)
  lines: PurchaseReceiptLineDto[];
}
