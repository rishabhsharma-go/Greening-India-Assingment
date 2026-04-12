import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_EXAMPLES, SWAGGER_MESSAGES } from '../../common/constants/swagger.constants';
import { TaskStatus, TaskPriority } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ example: SWAGGER_EXAMPLES.TASKS.TITLE, description: SWAGGER_MESSAGES.FIELDS.TASKS.TITLE })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({
    example: SWAGGER_EXAMPLES.TASKS.DESCRIPTION,
    description: SWAGGER_MESSAGES.FIELDS.TASKS.DESCRIPTION,
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: TaskStatus,
    default: TaskStatus.TODO,
    description: SWAGGER_MESSAGES.FIELDS.TASKS.STATUS,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
    description: SWAGGER_MESSAGES.FIELDS.TASKS.PRIORITY,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({
    example: SWAGGER_EXAMPLES.TASKS.DUE_DATE,
    description: SWAGGER_MESSAGES.FIELDS.TASKS.DUE_DATE,
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({
    example: SWAGGER_EXAMPLES.TASKS.ASSIGNEE_ID,
    description: SWAGGER_MESSAGES.FIELDS.TASKS.ASSIGNEE_ID,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
