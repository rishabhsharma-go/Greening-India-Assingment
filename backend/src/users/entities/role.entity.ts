import { Entity, PrimaryGeneratedColumn, Column, OneToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from '../enums/user-role.enum';
import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_EXAMPLES, SWAGGER_MESSAGES } from '../../common/constants/swagger.constants';

@Entity('roles')
export class Role {
  @ApiProperty({ example: SWAGGER_EXAMPLES.ROLE.ID, description: SWAGGER_MESSAGES.FIELDS.ROLE.ID })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.ROLE.NAME, description: SWAGGER_MESSAGES.FIELDS.ROLE.NAME })
  @Column({ unique: true })
  name!: string;

  @ApiProperty({ enum: UserRole, example: SWAGGER_EXAMPLES.ROLE.SLUG, description: SWAGGER_MESSAGES.FIELDS.ROLE.SLUG })
  @Column({ unique: true })
  slug!: UserRole;

  @BeforeInsert()
  @BeforeUpdate()
  toLowerCaseSlug() {
    if (this.slug) {
      this.slug = (this.slug as string).toLowerCase() as UserRole;
    }
  }

  @ApiProperty({ type: () => [User], description: SWAGGER_MESSAGES.FIELDS.ROLE.USERS })
  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}
