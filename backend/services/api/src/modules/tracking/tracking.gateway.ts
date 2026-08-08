import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TrackingService } from './tracking.service';

@WebSocketGateway({ namespace: '/v1/ws/tracking', cors: { origin: '*' } })
export class TrackingGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly trackingService: TrackingService) {}

  @SubscribeMessage('SUBSCRIBE')
  handleSubscribe(
    @MessageBody() data: { routeId: string },
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(`route:${data.routeId}`);

    // Flush current positions for this route immediately
    const state = this.trackingService.getVehiclesOnRoute(data.routeId);
    for (const v of state.vehicles) {
      client.emit('VEHICLE_POSITION', { type: 'VEHICLE_POSITION', ...v });
    }
  }

  @SubscribeMessage('SUBSCRIBE_ALL')
  handleSubscribeAll(@ConnectedSocket() client: Socket) {
    void client.join('all');

    // Flush all current live positions immediately
    for (const v of this.trackingService.getAllVehicles()) {
      client.emit('VEHICLE_POSITION', { type: 'VEHICLE_POSITION', ...v });
    }
  }

  @SubscribeMessage('UNSUBSCRIBE')
  handleUnsubscribe(
    @MessageBody() data: { routeId: string },
    @ConnectedSocket() client: Socket,
  ) {
    void client.leave(`route:${data.routeId}`);
  }

  handleDisconnect(_client: Socket) {
    // Socket.io cleans up room memberships on disconnect automatically
  }

  broadcastVehiclePosition(routeId: string | null, position: Record<string, unknown>) {
    const msg = { type: 'VEHICLE_POSITION', ...position };
    if (routeId) {
      this.server.to(`route:${routeId}`).emit('VEHICLE_POSITION', msg);
    }
    this.server.to('all').emit('VEHICLE_POSITION', msg);
  }

  broadcastAlert(routeId: string, alert: Record<string, unknown>) {
    const msg = { type: 'SERVICE_ALERT', ...alert };
    this.server.to(`route:${routeId}`).emit('SERVICE_ALERT', msg);
    this.server.to('all').emit('SERVICE_ALERT', msg);
  }
}
