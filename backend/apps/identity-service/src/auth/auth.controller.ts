import { IDENTITY } from '@malaika/common';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service.js';
import type { LoginInput, RegisterInput } from './auth.service.js';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @MessagePattern(IDENTITY.register)
  register(@Payload() data: RegisterInput) {
    return this.auth.register(data);
  }

  @MessagePattern(IDENTITY.login)
  login(@Payload() data: LoginInput) {
    return this.auth.login(data);
  }

  @MessagePattern(IDENTITY.platformLogin)
  platformLogin(@Payload() data: { email: string; password: string }) {
    return this.auth.platformLogin(data);
  }

  @MessagePattern(IDENTITY.refresh)
  refresh(@Payload() data: { refreshToken: string }) {
    return this.auth.refresh(data);
  }

  @MessagePattern(IDENTITY.logout)
  logout(@Payload() data: { refreshToken: string }) {
    return this.auth.logout(data);
  }

  @MessagePattern(IDENTITY.me)
  me(@Payload() data: { userId: string }) {
    return this.auth.me(data);
  }

  @MessagePattern(IDENTITY.listUsers)
  listUsers(@Payload() data: { tenantId: string; role?: 'CUSTOMER' | 'ADMIN'; page?: number; pageSize?: number }) {
    return this.auth.listUsers(data);
  }

  @MessagePattern(IDENTITY.createAdmin)
  createAdmin(@Payload() data: RegisterInput) {
    return this.auth.createAdmin(data);
  }
}
