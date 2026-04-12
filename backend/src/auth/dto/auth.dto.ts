import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_EXAMPLES } from '../../common/constants/swagger.constants';

export class RegisterDto {
  @ApiProperty({ example: SWAGGER_EXAMPLES.AUTH.NAME })
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.AUTH.EMAIL })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.AUTH.PASSWORD, minLength: 6 })
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: SWAGGER_EXAMPLES.AUTH.EMAIL })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.AUTH.PASSWORD })
  @IsNotEmpty()
  password!: string;
}
