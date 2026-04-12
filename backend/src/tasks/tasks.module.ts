import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TasksService } from './services/core/tasks.service';
import { TasksController } from './controllers/user/tasks.controller';
import { TasksAdminController } from './controllers/admin/tasks-admin.controller';
import { TasksAdminService } from './services/admin/tasks-admin.service';
import { ProjectsModule } from '../projects/projects.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, User]),
    forwardRef(() => ProjectsModule)
  ],
  controllers: [TasksController, TasksAdminController],
  providers: [TasksService, TasksAdminService],
  exports: [TasksService, TasksAdminService],
})
export class TasksModule {}
