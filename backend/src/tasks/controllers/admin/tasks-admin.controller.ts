import {
  Controller,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TasksAdminService } from '../../services/admin/tasks-admin.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../users/enums/user-role.enum';
import { UpdateTaskDto } from '../../dto/update-task.dto';
import { SWAGGER_MESSAGES } from '../../../common/constants/swagger.constants';

@ApiTags('Admin / Tasks')
@ApiBearerAuth()
@Controller({ path: 'admin/tasks', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TasksAdminController {
  constructor(private readonly tasksAdminService: TasksAdminService) {}

  @Patch(':id')
  @ApiOperation({ summary: SWAGGER_MESSAGES.ADMIN.TASKS.UPDATE })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksAdminService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: SWAGGER_MESSAGES.ADMIN.TASKS.DELETE })
  remove(@Param('id') id: string) {
    return this.tasksAdminService.remove(id);
  }
}
