import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { Shift } from '@prisma/client';

export class CreateFullDemandDto {
  @IsString()
  @IsNotEmpty()
  courseName!: string;

  @IsNumber()
  courseWorkload!: number;

  @IsString()
  @IsNotEmpty()
  classCode!: string;

  @IsString()
  @IsNotEmpty()
  subjectName!: string;

  @IsNumber()
  subjectWorkload!: number;

  @IsString()
  @IsNotEmpty()
  room!: string;

  @IsEnum(Shift)
  @IsOptional()
  shift?: Shift;

  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  endTime!: string;

  @IsString()
  @IsNotEmpty()
  startDate!: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  endDate!: string; // YYYY-MM-DD
}