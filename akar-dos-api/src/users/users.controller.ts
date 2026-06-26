import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination';
import type { AuthenticatedUser } from '../common/types';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(UserRole.GM, UserRole.OWNER, UserRole.EV_MANAGER, UserRole.PV_MANAGER, UserRole.TL)
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.users.list(actor, query);
  }

  @Get(':id')
  @Roles(UserRole.GM, UserRole.OWNER, UserRole.EV_MANAGER, UserRole.PV_MANAGER, UserRole.TL)
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Post()
  @Roles(UserRole.GM, UserRole.OWNER)
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.users.create(actor, dto);
  }

  @Patch(':id')
  @Roles(UserRole.GM, UserRole.OWNER)
  update(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(actor, id, dto);
  }
}
