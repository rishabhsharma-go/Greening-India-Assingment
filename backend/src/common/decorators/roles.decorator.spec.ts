import { Roles, ROLES_KEY } from './roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';

describe('RolesDecorator', () => {
  it('should set roles metadata', () => {
    const roles = [UserRole.ADMIN, UserRole.USER];
    
    class TestController {
      @Roles(...roles)
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.testMethod);
    expect(metadata).toEqual(roles);
  });
});
