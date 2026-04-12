import {
  Injectable,
} from '@nestjs/common';
import { TasksService } from '../core/tasks.service';
import { UpdateTaskDto } from '../../dto/update-task.dto';

@Injectable()
export class TasksAdminService extends TasksService {
  async update(id: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.findOne(id);

    Object.assign(task, updateTaskDto);
    const saved = await this.tasksRepository.save(task);
    await this.clearProjectCache(task.projectId);
    this.eventsGateway.emitTaskUpdate(task.projectId, saved);
    const stats = await this.projectsService.getStats(task.projectId);
    this.eventsGateway.emitStatsUpdate(task.projectId, stats);
    
    return saved;
  }

  async remove(id: string) {
    const task = await this.findOne(id);
    const projectId = task.projectId;
    await this.tasksRepository.softDelete(id);
    await this.clearProjectCache(projectId);
    
    this.eventsGateway.emitTaskUpdate(projectId, { id, deleted: true });
    const stats = await this.projectsService.getStats(projectId);
    this.eventsGateway.emitStatsUpdate(projectId, stats);
  }
}
