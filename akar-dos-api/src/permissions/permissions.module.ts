import { Global, Module } from '@nestjs/common';
import { PermissionEngine } from './permission.engine';
import { PermissionsController } from './permissions.controller';

@Global()
@Module({
  controllers: [PermissionsController],
  providers: [PermissionEngine],
  exports: [PermissionEngine],
})
export class PermissionsModule {}
