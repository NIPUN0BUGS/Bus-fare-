import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/v1/ws/tracking', cors: { origin: '*' } })
export class TrackingGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private subscriptions = new Map<string, Set<string>>();

  @SubscribeMessage('SUBSCRIBE')
  handleSubscribe(
    @MessageBody() data: { routeId: string; tripId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const key = data.routeId;
    if (!this.subscriptions.has(key)) this.subscriptions.set(key, new Set());
    this.subscriptions.get(key)?.add(client.id);
    void client.join(`route:${key}`);

    // Immediately send current status (may be unavailable in Phase 0)
    client.emit('TRACKING_UNAVAILABLE', {
      type: 'TRACKING_UNAVAILABLE',
      reason: 'GPS_STREAM_NOT_YET_CONFIGURED',
      message: 'Live tracking is currently unavailable. Schedule-based estimates are being shown.',
    });
  }

  @SubscribeMessage('UNSUBSCRIBE')
  handleUnsubscribe(
    @MessageBody() data: { routeId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.subscriptions.get(data.routeId)?.delete(client.id);
    void client.leave(`route:${data.routeId}`);
  }

  handleDisconnect(client: Socket) {
    for (const [, clients] of this.subscriptions) {
      clients.delete(client.id);
    }
  }

  broadcastVehiclePosition(routeId: string, position: Record<string, unknown>) {
    this.server.to(`route:${routeId}`).emit('VEHICLE_POSITION', {
      type: 'VEHICLE_POSITION',
      ...position,
    });
  }

  broadcastAlert(routeId: string, alert: Record<string, unknown>) {
    this.server.to(`route:${routeId}`).emit('SERVICE_ALERT', {
      type: 'SERVICE_ALERT',
      ...alert,
    });
  }
}
