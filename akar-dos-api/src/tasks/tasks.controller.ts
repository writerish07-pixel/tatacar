import { Controller, Get, Param, Post } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  /** My Work — the default landing data for every user (Master Spec §11.2). */
  @Get('my-work')
  myWork(@CurrentUser() user: AuthenticatedUser) {
    return this.tasks.myWork(user.id);
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tasks.complete(user.id, id);
  }
}
