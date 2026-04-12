import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from './events.gateway';
import { Socket, Server } from 'socket.io';

describe('EventsGateway', () => {
  let gateway: EventsGateway;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as unknown as Server;

  const mockSocket = {
    id: 'socket-id',
    join: jest.fn(),
  } as unknown as Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventsGateway],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should handle connection', () => {
    const logSpy = jest.spyOn(
      (gateway as unknown as { logger: { log: jest.Mock } }).logger,
      'log',
    );
    gateway.handleConnection(mockSocket);
    expect(logSpy).toHaveBeenCalledWith('Client connected: socket-id');
  });

  it('should handle disconnection', () => {
    const logSpy = jest.spyOn(
      (gateway as unknown as { logger: { log: jest.Mock } }).logger,
      'log',
    );
    gateway.handleDisconnect(mockSocket);
    expect(logSpy).toHaveBeenCalledWith('Client disconnected: socket-id');
  });

  it('should handle joinProject message', async () => {
    const result = await gateway.handleJoinProject(mockSocket, 'proj-1');
    const joinMock = (mockSocket as unknown as { join: jest.Mock }).join;
    expect(joinMock).toHaveBeenCalledWith('project_proj-1');
    expect(result).toEqual({ event: 'joined', data: 'proj-1' });
  });

  it('should emit task update', () => {
    gateway.emitTaskUpdate('proj-1', { id: 'task-1' });
    const toMock = (mockServer as unknown as { to: jest.Mock }).to;
    const emitMock = (mockServer as unknown as { emit: jest.Mock }).emit;
    expect(toMock).toHaveBeenCalledWith('project_proj-1');
    expect(emitMock).toHaveBeenCalledWith('taskUpdated', {
      id: 'task-1',
    });
  });

  it('should emit stats update', () => {
    (mockServer.emit as jest.Mock).mockClear();
    const stats = { statsByStatus: [], statsByAssignee: [] };
    gateway.emitStatsUpdate('proj-1', stats);
    const toMock = (mockServer as unknown as { to: jest.Mock }).to;
    const emitMock = (mockServer as unknown as { emit: jest.Mock }).emit;
    expect(toMock).toHaveBeenCalledWith('project_proj-1');
    expect(emitMock).toHaveBeenCalledWith('statsUpdated', stats);
  });
});
