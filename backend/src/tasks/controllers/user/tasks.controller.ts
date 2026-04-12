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
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from '../../services/core/tasks.service';
import { CreateTaskDto } from '../../dto/create-task.dto';
import { UpdateTaskDto } from '../../dto/update-task.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { User } from '../../../users/entities/user.entity';
import { TaskStatus, Task } from '../../entities/task.entity';
import { SWAGGER_MESSAGES, SWAGGER_EXAMPLES } from '../../../common/constants/swagger.constants';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CheckOwnership } from '../../../common/decorators/check-ownership.decorator';
import { UserRole } from '../../../users/enums/user-role.enum';

@ApiTags(SWAGGER_MESSAGES.TASKS.TAG)
@ApiBearerAuth()
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('/projects/:projectId/tasks')
  @ApiOperation({ summary: SWAGGER_MESSAGES.TASKS.CREATE })
  @ApiParam({ name: 'projectId', description: SWAGGER_MESSAGES.PARAMS.PROJECT_ID, example: SWAGGER_EXAMPLES.UUID })
  @ApiResponse({ status: 201, description: SWAGGER_MESSAGES.RESPONSES.TASK_CREATED })
  @ApiResponse({ status: 409, description: SWAGGER_MESSAGES.RESPONSES.TASK_CONFLICT })
  @ApiResponse({ status: 403, description: SWAGGER_MESSAGES.RESPONSES.FORBIDDEN_PROJECT_OWNER })
  @ApiResponse({ status: 401, description: SWAGGER_MESSAGES.RESPONSES.UNAUTHORIZED })
  create(
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
    @GetUser() user: User,
  ) {
    return this.tasksService.create(projectId, createTaskDto, user);
  }

  @Get('/projects/:projectId/tasks')
  @ApiOperation({ summary: SWAGGER_MESSAGES.TASKS.FIND_ALL })
  @ApiParam({ name: 'projectId', description: SWAGGER_MESSAGES.PARAMS.PROJECT_ID, example: SWAGGER_EXAMPLES.UUID })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus, description: SWAGGER_MESSAGES.PARAMS.TASK_STATUS })
  @ApiQuery({ name: 'assignee', required: false, description: SWAGGER_MESSAGES.PARAMS.TASK_ASSIGNEE })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: SWAGGER_MESSAGES.PARAMS.PAGE })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: SWAGGER_MESSAGES.PARAMS.LIMIT })
  @ApiResponse({ status: 200, description: SWAGGER_MESSAGES.RESPONSES.PAGINATED_TASKS })
  @ApiResponse({ status: 401, description: SWAGGER_MESSAGES.RESPONSES.UNAUTHORIZED })
  findAll(
    @Param('projectId') projectId: string,
    @Query('status') status?: TaskStatus,
    @Query('assignee') assignee?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.tasksService.findAll(projectId, status, assignee, +page, +limit);
  }

  @Get('/tasks/:id')
  @ApiOperation({ summary: SWAGGER_MESSAGES.TASKS.FIND_ONE })
  @ApiParam({ name: 'id', description: SWAGGER_MESSAGES.PARAMS.TASK_ID, example: SWAGGER_EXAMPLES.UUID })
  @ApiResponse({ status: 200, description: SWAGGER_MESSAGES.RESPONSES.TASK_WITH_ASSIGNEE })
  @ApiResponse({ status: 404, description: SWAGGER_MESSAGES.RESPONSES.TASK_NOT_FOUND })
  @ApiResponse({ status: 401, description: SWAGGER_MESSAGES.RESPONSES.UNAUTHORIZED })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch('/tasks/:id')
  @CheckOwnership(Task)
  @ApiOperation({ summary: SWAGGER_MESSAGES.TASKS.UPDATE })
  @ApiParam({ name: 'id', description: SWAGGER_MESSAGES.PARAMS.TASK_ID, example: SWAGGER_EXAMPLES.UUID })
  @ApiResponse({ status: 200, description: SWAGGER_MESSAGES.RESPONSES.TASK_UPDATED })
  @ApiResponse({ status: 403, description: SWAGGER_MESSAGES.RESPONSES.FORBIDDEN_TASK_OWNER })
  @ApiResponse({ status: 404, description: SWAGGER_MESSAGES.RESPONSES.TASK_NOT_FOUND })
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @GetUser() user: User,
  ) {
    return this.tasksService.update(id, updateTaskDto, user);
  }

  @Delete('/tasks/:id')
  @CheckOwnership(Task)
  @ApiOperation({ summary: SWAGGER_MESSAGES.TASKS.DELETE })
  @ApiParam({ name: 'id', description: SWAGGER_MESSAGES.PARAMS.TASK_ID, example: SWAGGER_EXAMPLES.UUID })
  @ApiResponse({ status: 200, description: SWAGGER_MESSAGES.RESPONSES.TASK_DELETED })
  @ApiResponse({ status: 403, description: SWAGGER_MESSAGES.RESPONSES.FORBIDDEN_TASK_OWNER })
  @ApiResponse({ status: 404, description: SWAGGER_MESSAGES.RESPONSES.TASK_NOT_FOUND })
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.tasksService.remove(id, user);
  }
}
