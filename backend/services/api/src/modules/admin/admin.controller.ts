import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@buslanka/shared-types';
import { AdminService } from './admin.service';

@ApiTags('Administration')
@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN, UserRole.PLATFORM_SUPERADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('operators')
  @ApiOperation({ summary: 'List all operators' })
  listOperators(@Query('status') status?: string) {
    return this.adminService.listOperators(status);
  }

  @Post('operators/:id/approve')
  @ApiOperation({ summary: 'Approve operator registration' })
  approveOperator(
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.adminService.approveOperator(id, body.notes);
  }

  @Post('operators/:id/suspend')
  @ApiOperation({ summary: 'Suspend an operator' })
  suspendOperator(
    @Param('id') id: string,
    @Body() body: { reason: string; durationDays?: number },
  ) {
    return this.adminService.suspendOperator(id, body.reason);
  }

  @Get('data-quality/gps')
  @ApiOperation({ summary: 'GPS data quality report per operator' })
  gpsQuality() {
    return this.adminService.gpsQualityReport();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Retrieve audit log entries' })
  auditLogs(
    @Query('resource') resource?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('perPage') perPage = 20,
  ) {
    return this.adminService.auditLogs({ resource, from, to, page, perPage });
  }
}
