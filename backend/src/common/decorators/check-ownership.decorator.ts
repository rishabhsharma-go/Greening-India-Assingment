import { SetMetadata, Type } from '@nestjs/common';
import { CHECK_OWNERSHIP_KEY } from '../constants/security.constants';

export const CheckOwnership = (entity: Type<object>) =>
  SetMetadata(CHECK_OWNERSHIP_KEY, entity);
