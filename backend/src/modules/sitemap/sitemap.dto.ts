import { IsString, IsOptional } from 'class-validator';

export class UpdateRobotsDto {
  @IsString()
  content: string;
}