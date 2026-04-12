import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { TaskStatus } from './entities/task.entity';
import { SWAGGER_MESSAGES } from '../common/constants/swagger.constants';

@ApiTags(SWAGGER_MESSAGES.TASKS.TAG)
@ApiBearerAuth()
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: SWAGGER_MESSAGES.TASKS.CREATE })
  create(
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
    @GetUser() user: User,
  ) {
    return this.tasksService.create(projectId, createTaskDto, user);
  }

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: SWAGGER_MESSAGES.TASKS.FIND_ALL })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'assignee', required: false })
  findAll(
    @Param('projectId') projectId: string,
    @Query('status') status?: TaskStatus,
    @Query('assignee') assignee?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.tasksService.findAll(
      projectId,
      status,
      assignee,
      +page,
      +limit,
    );
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: SWAGGER_MESSAGES.TASKS.UPDATE })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: SWAGGER_MESSAGES.TASKS.DELETE })
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.tasksService.remove(id, user);
  }
}
