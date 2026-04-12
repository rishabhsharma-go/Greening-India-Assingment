import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_EXAMPLES, SWAGGER_MESSAGES } from '../../common/constants/swagger.constants';

export class CreateUserDto {
  @ApiProperty({
    example: SWAGGER_EXAMPLES.USER.NAME,
    description: SWAGGER_MESSAGES.FIELDS.USER.NAME,
  })
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: SWAGGER_EXAMPLES.USER.EMAIL,
    description: SWAGGER_MESSAGES.FIELDS.USER.EMAIL,
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: SWAGGER_EXAMPLES.AUTH.PASSWORD,
    description: SWAGGER_MESSAGES.FIELDS.USER.PASSWORD,
    minLength: 6,
  })
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
