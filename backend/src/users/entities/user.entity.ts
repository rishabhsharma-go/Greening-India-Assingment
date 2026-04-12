import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Role } from './role.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { SWAGGER_EXAMPLES, SWAGGER_MESSAGES } from '../../common/constants/swagger.constants';

@Entity('users')
export class User {
  @ApiProperty({ example: SWAGGER_EXAMPLES.USER.ID, description: SWAGGER_MESSAGES.FIELDS.USER.ID })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.USER.NAME, description: SWAGGER_MESSAGES.FIELDS.USER.NAME })
  @Column()
  name!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.USER.EMAIL, description: SWAGGER_MESSAGES.FIELDS.USER.EMAIL })
  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  @ApiProperty({ type: () => Role, description: SWAGGER_MESSAGES.FIELDS.USER.ROLE })
  @Transform(({ value }) => (value && value.slug ? value.slug : value))
  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ name: 'role_id' })
  roleId!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.TIMESTAMPS.INITIALIZATION, description: SWAGGER_MESSAGES.FIELDS.USER.CREATED_AT })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ example: SWAGGER_EXAMPLES.TIMESTAMPS.RECALIBRATION, description: SWAGGER_MESSAGES.FIELDS.USER.UPDATED_AT })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date;

  @ApiProperty({ type: () => [Project], description: SWAGGER_MESSAGES.FIELDS.USER.PROJECTS })
  @OneToMany(() => Project, (project) => project.owner)
  projects!: Project[];

  @ApiProperty({ type: () => [Task], description: SWAGGER_MESSAGES.FIELDS.USER.TASKS })
  @OneToMany(() => Task, (task) => task.assignee)
  tasks!: Task[];
}
