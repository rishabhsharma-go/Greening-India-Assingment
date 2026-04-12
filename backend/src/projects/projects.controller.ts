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
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

import { PROJECT_MESSAGES } from './constants/project-messages';
import { SWAGGER_MESSAGES } from '../common/constants/swagger.constants';

@ApiTags(SWAGGER_MESSAGES.PROJECTS.TAG)
@ApiBearerAuth()
@Controller({ path: 'projects', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: SWAGGER_MESSAGES.PROJECTS.CREATE })
  @ApiResponse({ status: 201, description: PROJECT_MESSAGES.CREATED })
  create(@Body() createProjectDto: CreateProjectDto, @GetUser() user: User) {
    return this.projectsService.create(createProjectDto, user);
  }

  @Get()
  @ApiOperation({ summary: SWAGGER_MESSAGES.PROJECTS.FIND_ALL })
  findAll(
    @GetUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.projectsService.findAll(user, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: SWAGGER_MESSAGES.PROJECTS.FIND_ONE })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: SWAGGER_MESSAGES.PROJECTS.UPDATE })
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @GetUser() user: User,
  ) {
    return this.projectsService.update(id, updateProjectDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: SWAGGER_MESSAGES.PROJECTS.DELETE })
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.projectsService.remove(id, user);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: SWAGGER_MESSAGES.PROJECTS.STATS })
  getStats(@Param('id') id: string) {
    return this.projectsService.getStats(id);
  }
}
