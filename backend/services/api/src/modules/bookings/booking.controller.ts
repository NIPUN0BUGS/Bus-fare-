import { Controller, Post, Get, Body, Param, UseGuards, Request, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BookingService } from './booking.service';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a booking and lock a seat' })
  create(
    @Body() body: { tripId: string; fromStopId: string; toStopId: string; passengerType: string; seatId?: string },
    @Request() req: { user: { id: string } },
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.bookingService.create(req.user.id, body, idempotencyKey);
  }

  @Get()
  @ApiOperation({ summary: 'List passenger bookings' })
  findAll(@Request() req: { user: { id: string } }) {
    return this.bookingService.findByPassenger(req.user.id);
  }

  @Get(':id/ticket')
  @ApiOperation({ summary: 'Get QR-code ticket for a confirmed booking' })
  getTicket(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.bookingService.getTicket(id, req.user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  cancel(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req: { user: { id: string } },
  ) {
    return this.bookingService.cancel(id, req.user.id, body.reason);
  }
}
