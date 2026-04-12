import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
  SECURITY_MESSAGES,
  PUBLIC_KEY,
  CHECK_OWNERSHIP_KEY,
} from '../constants/security.constants';
import { UserRole } from '../../users/enums/user-role.enum';
import { Task } from '../../tasks/entities/task.entity';
import { FindOptionsWhere } from 'typeorm';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles) {
      if (!user || user.role?.slug === undefined) return false;
      
      const hasRole = requiredRoles.includes(user.role.slug as UserRole);
      if (!hasRole) {
        throw new ForbiddenException(
          SECURITY_MESSAGES.FORBIDDEN_RESOURCE(user.role.slug),
        );
      }
    }

    if (user && user.role?.slug === UserRole.ADMIN) return true;

    const entityType = this.reflector.get<Type<any>>(
      CHECK_OWNERSHIP_KEY,
      context.getHandler(),
    );

    if (entityType) {
      if (!user) return false;
      const resourceId: string = request.params.id;
      if (!resourceId) return true;

      const repository = this.dataSource.getRepository(entityType);
      const resource = await repository.findOne({
        where: { id: resourceId } as FindOptionsWhere<object>,
        relations: (entityType as Function) === Task ? ['project'] : [],
      });

      if (!resource) {
        throw new NotFoundException(
          SECURITY_MESSAGES.RESOURCE_NOT_FOUND(entityType.name),
        );
      }

      if (entityType === Task) {
        const task = resource as Task;
        const isCreator = task.creatorId === user.id;
        const isAssignee = task.assigneeId === user.id;
        const isUnassignedAndOwner = !task.assigneeId && task.project?.ownerId === user.id;
        
        if (!isCreator && !isAssignee && !isUnassignedAndOwner) {
          throw new ForbiddenException(SECURITY_MESSAGES.OWNERSHIP_TASK_REQUIRED);
        }
      } else if ('ownerId' in resource && resource['ownerId'] !== user.id) {
        throw new ForbiddenException(SECURITY_MESSAGES.OWNERSHIP_REQUIRED(entityType.name));
      }
    }

    return true;
  }
}
