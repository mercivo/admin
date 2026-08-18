import { IsString, IsOptional, IsIn, IsInt, Min, MaxLength } from 'class-validator';

export class CreateDictTypeDto {
  @IsString()
  @MaxLength(100)
  typeId: string;

  @IsString()
  @MaxLength(255)
  label: string;

  @IsString()
  @MaxLength(50)
  icon: string;
}

export class CreateDictEntryDto {
  @IsString()
  @MaxLength(100)
  code: string;

  @IsString()
  @MaxLength(255)
  label: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  parentCode?: string;
}

export class UpdateDictEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  parentCode?: string;
}
