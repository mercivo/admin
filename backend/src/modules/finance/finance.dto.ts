import {
  IsDateString,
  IsIn,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { FinancePaymentMethod } from "./finance.entity";

export class CreateFinanceTransactionDto {
  @IsString() orderId: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount: number;
  @IsIn(["bank_transfer", "cash", "wechat", "alipay", "other"])
  paymentMethod: FinancePaymentMethod;
  @IsOptional() @IsString() @MaxLength(100) accountName?: string;
  @IsOptional() @IsString() @MaxLength(100) referenceNo?: string;
  @IsDateString() transactionDate: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}

export class CancelFinanceTransactionDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
}
