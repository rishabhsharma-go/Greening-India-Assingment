import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existing = await this.usersService.findByEmailWithPassword(registerDto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const result = { ...user };
    delete (result as { password?: string }).password;
    const token = await this.jwtService.signAsync({
      sub: user.id,
      user_id: user.id,
      email: user.email,
      role: user.role,
    });

    return { token, user: result };
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Partial<User> | null> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const userWithoutPassword = { ...user };
      delete (userWithoutPassword as { password?: string }).password;
      return userWithoutPassword;
    }
    return null;
  }

  async login(user: Partial<User>) {
    const token = await this.jwtService.signAsync({
      sub: user.id,
      user_id: user.id,
      email: user.email,
      role: user.role,
    });

    return { token, user };
  }
}
