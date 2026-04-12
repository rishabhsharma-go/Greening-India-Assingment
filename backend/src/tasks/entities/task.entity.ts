import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Unique } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

import { ApiProperty } from '@nestjs/swagger';
import { SWAGGER_EXAMPLES, SWAGGER_MESSAGES } from '../../common/constants/swagger.constants';

@Entity('tasks')
@Unique(['projectId', 'title'])
export class Task {
  @ApiProperty({ example: SWAGGER_EXAMPLES.TASKS.ID, description: SWAGGER_MESSAGES.FIELDS.TASKS.ID })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.TASKS.TITLE, description: SWAGGER_MESSAGES.FIELDS.TASKS.TITLE })
  @Column()
  title!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.TASKS.DESCRIPTION, description: SWAGGER_MESSAGES.FIELDS.TASKS.DESCRIPTION })
  @Column({ nullable: true })
  description!: string;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.TODO, description: SWAGGER_MESSAGES.FIELDS.TASKS.STATUS })
  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status!: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.MEDIUM, description: SWAGGER_MESSAGES.FIELDS.TASKS.PRIORITY })
  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority!: TaskPriority;

  @ApiProperty({ example: SWAGGER_EXAMPLES.PROJECTS.ID, description: SWAGGER_MESSAGES.FIELDS.TASKS.PROJECT_ID })
  @Column({ name: 'project_id' })
  projectId!: string;

  @ManyToOne(() => Project, (project) => project.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ApiProperty({ example: SWAGGER_EXAMPLES.USER.ID, description: SWAGGER_MESSAGES.FIELDS.TASKS.CREATOR_ID })
  @Column({ name: 'creator_id' })
  creatorId!: string;

  @ApiProperty({ type: () => User, description: SWAGGER_MESSAGES.FIELDS.TASKS.CREATOR })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'creator_id' })
  creator!: User;

  @Column({ name: 'assignee_id', nullable: true })
  assigneeId!: string;

  @ApiProperty({ type: () => User, description: SWAGGER_MESSAGES.FIELDS.TASKS.ASSIGNEE, required: false })
  @ManyToOne(() => User, (user) => user.tasks, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee!: User;

  @ApiProperty({ example: '2026-04-30', description: SWAGGER_MESSAGES.FIELDS.TASKS.DUE_DATE, required: false })
  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: string;

  @ApiProperty({ example: SWAGGER_EXAMPLES.TIMESTAMPS.INITIALIZATION, description: SWAGGER_MESSAGES.FIELDS.TASKS.CREATED_AT })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ example: SWAGGER_EXAMPLES.TIMESTAMPS.RECALIBRATION, description: SWAGGER_MESSAGES.FIELDS.TASKS.UPDATED_AT })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date;
}
