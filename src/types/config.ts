/**
 * Application Configuration Types
 */

export interface ProxyConfig {
  server: ServerConfig;
  rpc: RPCConfig;
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
  logging: LoggingConfig;
  security: SecurityConfig;
  performance: PerformanceConfig;
  metrics: MetricsConfig;
}

export interface ServerConfig {
  port: number;
  host: string;
  environment: string;
}

export interface RPCConfig {
  url: string;
  timeout: number;
  retries: number;
  initialTimeoutMs: number;
  networks: Record<string, NetworkConfig>;
  batchConcurrencyLimit: number;
  batchTimeout: number;
}

export interface NetworkConfig {
  url: string;
  timeout: number;
  retries: number;
  retry_delay: number;
}

export interface CacheConfig {
  maxAge: number;
  dbFile?: string;
  maxSize: number;
  enableDb: boolean;
  type: string;
  compression: CompressionConfig;
  redis: RedisConfig;
  clickhouse: ClickHouseConfig;
  ttl: TTLConfig;
}

export interface CompressionConfig {
  enabled: boolean;
  threshold: number;
  minRatio: number;
}

export interface RedisConfig {
  url: string;
  maxMemory: string;
  maxMemoryPolicy: string;
}

export interface ClickHouseConfig {
  url: string;
  database: string;
  user: string;
  password: string;
}

export interface TTLConfig {
  default: number;
  immutable: number;
  blockData: number;
  logData: number;
  callData: number;
  receiptData: number;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface LoggingConfig {
  level: string;
  enableConsole: boolean;
}

export interface SecurityConfig {
  allowedOrigins: string[];
  enableHelmet: boolean;
  enableCors: boolean;
}

export interface PerformanceConfig {
  connectionPool: ConnectionPoolConfig;
  circuitBreaker: CircuitBreakerConfig;
  requestQueue: RequestQueueConfig;
  cacheWarming: CacheWarmingConfig;
  subgraph: SubgraphConfig;
}

export interface ConnectionPoolConfig {
  enabled: boolean;
  size: number;
  timeout: number;
  keepalive: boolean;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  threshold: number;
  timeout: number;
}

export interface RequestQueueConfig {
  enabled: boolean;
  size: number;
  concurrency: number;
}

export interface CacheWarmingConfig {
  enabled: boolean;
  interval: number;
}

export interface SubgraphConfig {
  enabled: boolean;
  prefetch: PrefetchConfig;
}

export interface PrefetchConfig {
  enabled: boolean;
  interval: number;
}

export interface MetricsConfig {
  enabled: boolean;
  port: number;
  path: string;
}