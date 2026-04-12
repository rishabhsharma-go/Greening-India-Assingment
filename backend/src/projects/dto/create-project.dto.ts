import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_EXAMPLES, SWAGGER_MESSAGES } from '../../common/constants/swagger.constants';

export class CreateProjectDto {
  @ApiProperty({ example: SWAGGER_EXAMPLES.PROJECTS.NAME, description: SWAGGER_MESSAGES.FIELDS.PROJECTS.NAME })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    example: SWAGGER_EXAMPLES.PROJECTS.DESCRIPTION,
    description: SWAGGER_MESSAGES.FIELDS.PROJECTS.DESCRIPTION,
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
