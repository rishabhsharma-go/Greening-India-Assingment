import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
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

    const userResult = { 
      ...user,
      role: user.role.slug,
    };
    delete (userResult as { password?: string }).password;
    
    const token = await this.jwtService.signAsync({
      sub: user.id,
      user_id: user.id,
      email: user.email,
      role: user.role.slug,
    });

    return { token, user: userResult };
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
    const roleSlug = (user.role as Role)?.slug || 'user';
    
    const token = await this.jwtService.signAsync({
      sub: user.id,
      user_id: user.id,
      email: user.email,
      role: roleSlug,
    });

    return { 
      token, 
      user: {
        ...user,
        role: roleSlug,
      } 
    };
  }
}
