import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { USER_MESSAGES } from './constants/user-messages';
import { SWAGGER_MESSAGES } from '../common/constants/swagger.constants';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags(SWAGGER_MESSAGES.USERS.TAG)
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':email')
  @ApiOperation({ summary: SWAGGER_MESSAGES.USERS.FIND_ONE })
  @ApiResponse({ status: 200, description: USER_MESSAGES.FOUND })
  @ApiResponse({ status: 404, description: USER_MESSAGES.NOT_FOUND })
  findOne(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }
}
