import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectsService } from './services/core/projects.service';
import { ProjectsAdminService } from './services/admin/projects-admin.service';
import { ProjectsController } from './controllers/user/projects.controller';
import { ProjectsAdminController } from './controllers/admin/projects-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [ProjectsController, ProjectsAdminController],
  providers: [ProjectsService, ProjectsAdminService],
  exports: [ProjectsService, ProjectsAdminService],
})
export class ProjectsModule {}
