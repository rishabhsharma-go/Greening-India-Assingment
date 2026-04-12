import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_EXAMPLES } from '../../common/constants/swagger.constants';

export class CreateProjectDto {
  @ApiProperty({ example: SWAGGER_EXAMPLES.PROJECTS.NAME })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    example: SWAGGER_EXAMPLES.PROJECTS.DESCRIPTION,
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
