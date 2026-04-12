import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
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
import { ProjectsAdminService } from '../../services/admin/projects-admin.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../users/enums/user-role.enum';
import { UpdateProjectDto } from '../../dto/update-project.dto';
import { SWAGGER_EXAMPLES, SWAGGER_MESSAGES } from '../../../common/constants/swagger.constants';

@ApiTags('Admin / Projects')
@ApiBearerAuth()
@Controller({ path: 'admin/projects', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ProjectsAdminController {
  constructor(private readonly projectsAdminService: ProjectsAdminService) {}

  @Get('system/stats')
  @ApiOperation({ summary: SWAGGER_MESSAGES.ADMIN.PROJECTS.GET_STATS })
  @ApiResponse({ status: 200, description: SWAGGER_MESSAGES.RESPONSES.SYSTEM_STATS })
  @ApiResponse({ status: 403, description: SWAGGER_MESSAGES.RESPONSES.FORBIDDEN_ADMIN })
  getSystemStats() {
    return this.projectsAdminService.getSystemStats();
  }

  @Get()
  @ApiOperation({ summary: SWAGGER_MESSAGES.ADMIN.PROJECTS.GET_ALL })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: SWAGGER_MESSAGES.PARAMS.PAGE })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: SWAGGER_MESSAGES.PARAMS.LIMIT })
  @ApiResponse({ status: 200, description: SWAGGER_MESSAGES.RESPONSES.PAGINATED_SYSTEM_PROJECTS })
  @ApiResponse({ status: 403, description: SWAGGER_MESSAGES.RESPONSES.FORBIDDEN_ADMIN })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.projectsAdminService.findAll(+page, +limit);
  }

  @Patch(':id')
  @ApiOperation({ summary: SWAGGER_MESSAGES.ADMIN.PROJECTS.UPDATE })
  @ApiParam({ name: 'id', description: SWAGGER_MESSAGES.PARAMS.PROJECT_ID, example: SWAGGER_EXAMPLES.UUID })
  @ApiResponse({ status: 200, description: SWAGGER_MESSAGES.RESPONSES.PROJECT_ADMIN_UPDATED })
  @ApiResponse({ status: 403, description: SWAGGER_MESSAGES.RESPONSES.FORBIDDEN_ADMIN })
  @ApiResponse({ status: 404, description: SWAGGER_MESSAGES.RESPONSES.PROJECT_NOT_FOUND })
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsAdminService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: SWAGGER_MESSAGES.ADMIN.PROJECTS.DELETE })
  @ApiParam({ name: 'id', description: SWAGGER_MESSAGES.PARAMS.PROJECT_ID, example: SWAGGER_EXAMPLES.UUID })
  @ApiResponse({ status: 200, description: SWAGGER_MESSAGES.RESPONSES.PROJECT_ADMIN_DELETED })
  @ApiResponse({ status: 403, description: SWAGGER_MESSAGES.RESPONSES.FORBIDDEN_ADMIN })
  @ApiResponse({ status: 404, description: SWAGGER_MESSAGES.RESPONSES.PROJECT_NOT_FOUND })
  remove(@Param('id') id: string) {
    return this.projectsAdminService.remove(id);
  }
}
