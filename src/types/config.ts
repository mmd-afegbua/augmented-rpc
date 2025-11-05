/**
 * Simplified Application Configuration Types
 */

export interface ProxyConfig {
  server: ServerConfig;
  rpc: RPCConfig;
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
  cors: CorsConfig;
  helmet: HelmetConfig;
}

export interface ServerConfig {
  port: number;
  host: string;
  environment: string;
  log_level?: string;
}

export interface UpstreamConfig {
  url: string;
  timeout?: number;
  retries?: number;
  retry_delay?: number;
  weight?: number; // For load balancing
  priority?: number; // For failover order
}

export interface NetworkConfig {
  primary: UpstreamConfig;
  fallback?: UpstreamConfig;
  timeout?: number;
  retries?: number;
  retry_delay?: number;
  failover_strategy?: 'immediate' | 'circuit_breaker' | 'health_check';
  health_check_interval?: number;
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
  maxRequests: number;
}

export interface CorsConfig {
  enabled: boolean;
  origin: string;
  credentials: boolean;
}

export interface HelmetConfig {
  enabled: boolean;
  contentSecurityPolicy: boolean;
}