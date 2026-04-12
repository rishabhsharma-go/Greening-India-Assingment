import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_EXAMPLES } from '../../common/constants/swagger.constants';
import { TaskStatus, TaskPriority } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ example: SWAGGER_EXAMPLES.TASKS.TITLE })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.TASKS.DESCRIPTION, required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TaskStatus, default: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ example: SWAGGER_EXAMPLES.TASKS.DUE_DATE, required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.TASKS.ASSIGNEE_ID, required: false })
  @IsOptional()
  @IsString()
  assigneeId?: string;
}
