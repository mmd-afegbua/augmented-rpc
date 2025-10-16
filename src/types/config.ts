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
}

export interface RPCConfig {
  url: string;
  timeout: number;
  retries: number;
  initialTimeoutMs: number;
  networks: Record<string, NetworkConfig>;
  batchConcurrencyLimit: number;
  batchTimeout: number;
  // Global primary/fallback upstream configuration (fallback for networks without specific fallbacks)
  upstreams?: {
    primary: UpstreamConfig;
    fallback: UpstreamConfig;
  };
}

export interface NetworkConfig {
  url: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  priority?: number;
  // Network-specific fallback
  fallbackUrl?: string;
  fallbackTimeout?: number;
  fallbackRetries?: number;
  fallbackRetryDelay?: number;
}

export interface UpstreamConfig {
  url: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  priority?: number;
}

export interface CacheConfig {
  maxAge: number;
  dbFile?: string;
  maxSize: number;
  enableDb: boolean;
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