import { Injectable } from '@nestjs/common';

@Injectable()
export class BookingService {
  async create(passengerId: string, body: Record<string, unknown>, idempotencyKey: string) {
    // Full implementation in Phase 3
    void passengerId; void body; void idempotencyKey;
    return { message: 'Booking service will be implemented in Phase 3.' };
  }

  async findByPassenger(passengerId: string) {
    void passengerId;
    return { bookings: [] };
  }

  async getTicket(bookingId: string, passengerId: string) {
    void bookingId; void passengerId;
    return { message: 'Ticketing will be implemented in Phase 3.' };
  }

  async cancel(bookingId: string, passengerId: string, reason: string) {
    void bookingId; void passengerId; void reason;
    return { message: 'Cancellation will be implemented in Phase 3.' };
  }
}
