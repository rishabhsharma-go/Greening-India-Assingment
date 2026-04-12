import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AUTH_MESSAGES } from './constants/auth-messages';
import { SWAGGER_MESSAGES } from '../common/constants/swagger.constants';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/auth.dto';
import { User } from '../users/entities/user.entity';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: SWAGGER_MESSAGES.AUTH.REGISTER })
  @ApiResponse({ status: 201, description: AUTH_MESSAGES.USER_REGISTERED })
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: SWAGGER_MESSAGES.AUTH.LOGIN })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: AUTH_MESSAGES.LOGIN_SUCCESS })
  login(@GetUser() user: User) {
    return this.authService.login(user);
  }
}
