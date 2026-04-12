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
import { ProjectsService } from '../../services/core/projects.service';
import { CreateProjectDto } from '../../dto/create-project.dto';
import { UpdateProjectDto } from '../../dto/update-project.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { User } from '../../../users/entities/user.entity';
import { PROJECT_MESSAGES } from '../../constants/project-messages';
import { SWAGGER_MESSAGES, SWAGGER_EXAMPLES } from '../../../common/constants/swagger.constants';
import { Project } from '../../entities/project.entity';
import { CheckOwnership } from '../../../common/decorators/check-ownership.decorator';
import { UserRole } from '../../../users/enums/user-role.enum';

@ApiTags(SWAGGER_MESSAGES.PROJECTS.TAG)
@ApiBearerAuth()
@Controller({ path: 'projects', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: SWAGGER_MESSAGES.PROJECTS.CREATE })
  @ApiResponse({ status: 201, description: PROJECT_MESSAGES.CREATED })
  @ApiResponse({ status: 409, description: SWAGGER_MESSAGES.RESPONSES.PROJECT_CONFLICT })
  @ApiResponse({ status: 401, description: SWAGGER_MESSAGES.RESPONSES.UNAUTHORIZED })
  create(@Body() createProjectDto: CreateProjectDto, @GetUser() user: User) {
    return this.projectsService.create(createProjectDto, user);
  }

  @Get()
  @ApiOperation({ summary: SWAGGER_MESSAGES.PROJECTS.FIND_ALL })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: SWAGGER_MESSAGES.PARAMS.PAGE })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: SWAGGER_MESSAGES.PARAMS.LIMIT })
  @ApiResponse({ status: 200, description: SWAGGER_MESSAGES.RESPONSES.PAGINATED_PROJECTS })
  @ApiResponse({ status: 401, description: SWAGGER_MESSAGES.RESPONSES.UNAUTHORIZED })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.projectsService.findAll(+page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: SWAGGER_MESSAGES.PROJECTS.FIND_ONE })
  @ApiParam({ name: 'id', description: SWAGGER_MESSAGES.PARAMS.PROJECT_ID, example: SWAGGER_EXAMPLES.UUID })
  @ApiResponse({ status: 200, description: SWAGGER_MESSAGES.RESPONSES.PROJECT_WITH_TASKS })
  @ApiResponse({ status: 404, description: SWAGGER_MESSAGES.RESPONSES.PROJECT_NOT_FOUND })
  @ApiResponse({ status: 401, description: SWAGGER_MESSAGES.RESPONSES.UNAUTHORIZED })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @CheckOwnership(Project)
  @ApiOperation({ summary: SWAGGER_MESSAGES.PROJECTS.UPDATE })
  @ApiParam({ name: 'id', description: SWAGGER_MESSAGES.PARAMS.PROJECT_ID, example: SWAGGER_EXAMPLES.UUID })
  @ApiResponse({ status: 200, description: SWAGGER_MESSAGES.RESPONSES.PROJECT_UPDATED })
  @ApiResponse({ status: 403, description: SWAGGER_MESSAGES.RESPONSES.FORBIDDEN_PROJECT_OWNER })
  @ApiResponse({ status: 404, description: SWAGGER_MESSAGES.RESPONSES.PROJECT_NOT_FOUND })
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @GetUser() user: User,
  ) {
    return this.projectsService.update(id, updateProjectDto, user);
  }

  @Delete(':id')
  @CheckOwnership(Project)
  @ApiOperation({ summary: SWAGGER_MESSAGES.PROJECTS.DELETE })
  @ApiParam({ name: 'id', description: SWAGGER_MESSAGES.PARAMS.PROJECT_ID, example: SWAGGER_EXAMPLES.UUID })
  @ApiResponse({ status: 200, description: SWAGGER_MESSAGES.RESPONSES.PROJECT_DELETED })
  @ApiResponse({ status: 403, description: SWAGGER_MESSAGES.RESPONSES.FORBIDDEN_PROJECT_OWNER })
  @ApiResponse({ status: 404, description: SWAGGER_MESSAGES.RESPONSES.PROJECT_NOT_FOUND })
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.projectsService.remove(id, user);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: SWAGGER_MESSAGES.PROJECTS.STATS })
  @ApiParam({ name: 'id', description: SWAGGER_MESSAGES.PARAMS.PROJECT_ID, example: SWAGGER_EXAMPLES.UUID })
  @ApiResponse({ status: 200, description: SWAGGER_MESSAGES.RESPONSES.PROJECT_STATS })
  @ApiResponse({ status: 404, description: SWAGGER_MESSAGES.RESPONSES.PROJECT_NOT_FOUND })
  getStats(@Param('id') id: string) {
    return this.projectsService.getStats(id);
  }
}
