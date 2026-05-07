import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'default-secret',
      });
      client.user = payload;
      return true;
    } catch {
      return false;
    }
  }

  private extractToken(client: any): string | null {
    // Try handshake auth first
    const auth = client.handshake?.auth?.token;
    if (auth) return auth;

    // Try query parameter
    const query = client.handshake?.query?.token;
    if (query) return query as string;

    // Try headers
    const headers = client.handshake?.headers?.authorization;
    if (headers) {
      const [type, token] = headers.split(' ');
      if (type === 'Bearer') return token;
    }

    return null;
  }
}
