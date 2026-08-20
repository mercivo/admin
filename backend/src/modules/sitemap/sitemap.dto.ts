import { IsString } from 'class-validator';

export class UpdateRobotsDto {
  @IsString()
  content: string;
}
