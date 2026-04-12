import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Unique } from 'typeorm';

import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_EXAMPLES, SWAGGER_MESSAGES } from '../../common/constants/swagger.constants';

@Entity('projects')
@Unique(['ownerId', 'name'])
export class Project {
  @ApiProperty({ example: SWAGGER_EXAMPLES.PROJECTS.ID, description: SWAGGER_MESSAGES.FIELDS.PROJECTS.ID })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.PROJECTS.NAME, description: SWAGGER_MESSAGES.FIELDS.PROJECTS.NAME })
  @Column()
  name!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.PROJECTS.DESCRIPTION, description: SWAGGER_MESSAGES.FIELDS.PROJECTS.DESCRIPTION })
  @Column({ nullable: true })
  description!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.USER.ID, description: SWAGGER_MESSAGES.FIELDS.PROJECTS.OWNER_ID })
  @Column({ name: 'owner_id' })
  ownerId!: string;

  @ApiProperty({ type: () => User, description: SWAGGER_MESSAGES.FIELDS.PROJECTS.OWNER })
  @ManyToOne(() => User, (user) => user.projects)
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @ApiProperty({ example: SWAGGER_EXAMPLES.TIMESTAMPS.INITIALIZATION, description: SWAGGER_MESSAGES.FIELDS.PROJECTS.CREATED_AT })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ example: SWAGGER_EXAMPLES.TIMESTAMPS.RECALIBRATION, description: SWAGGER_MESSAGES.FIELDS.PROJECTS.UPDATED_AT })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date;

  @ApiProperty({ type: () => [Task], description: SWAGGER_MESSAGES.FIELDS.PROJECTS.TASKS })
  @OneToMany(() => Task, (task) => task.project, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  tasks!: Task[];
}
