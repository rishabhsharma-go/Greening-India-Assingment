import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { ProjectStats } from '../../projects/interfaces/project-stats.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinProject')
  async handleJoinProject(client: Socket, projectId: string) {
    await client.join(`project_${projectId}`);
    return { event: 'joined', data: projectId };
  }

  emitTaskUpdate(
    projectId: string,
    data: { id: string; status?: string; deleted?: boolean },
  ) {
    this.server.to(`project_${projectId}`).emit('taskUpdated', data);
  }

  emitStatsUpdate(projectId: string, stats: ProjectStats | { id: string; deleted: boolean }) {
    this.server.to(`project_${projectId}`).emit('statsUpdated', stats);
  }
}
