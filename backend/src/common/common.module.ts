import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './services/redis.service';
import { RedisMockService } from './services/redis-mock.service';

const redisProvider = {
  provide: RedisService,
  useFactory: (configService: ConfigService) => {
    const useMock = configService.get('USE_REDIS_MOCK') === 'true' || 
                    configService.get('NODE_ENV') !== 'production';
    
    if (useMock) {
      return new RedisMockService() as any;
    }
    return new RedisService(configService);
  },
  inject: [ConfigService],
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [redisProvider],
  exports: [RedisService],
})
export class CommonModule {}
