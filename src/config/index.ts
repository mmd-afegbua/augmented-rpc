import { ProxyConfig } from '@/types/config';
import { DEFAULT_VALUES } from './constants';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
export { DEFAULT_VALUES } from './constants';

/**
 * Configuration Manager - Singleton pattern for app configuration
 * Supports both environment variables and YAML configuration files
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: ProxyConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): ProxyConfig {
    // Try to load YAML config first, then fall back to environment variables
    const yamlConfig = this.loadYamlConfig();
    
    if (yamlConfig) {
      return this.mergeWithEnvVars(yamlConfig);
    }
    
    // Fallback to environment variables only
    return this.loadFromEnvVars();
  }

  private loadYamlConfig(): any {
    const configPaths = [
      process.env.CONFIG_FILE,
      './config.yaml',
      './config.yml',
      './config/config.yaml',
      './config/config.yml'
    ].filter(Boolean);

    for (const configPath of configPaths) {
      if (configPath && fs.existsSync(configPath)) {
        try {
          const fileContents = fs.readFileSync(configPath, 'utf8');
          const yamlConfig = yaml.load(fileContents) as any;
          console.log(`Loaded configuration from: ${configPath}`);
          return yamlConfig;
        } catch (error) {
          console.warn(`Failed to load YAML config from ${configPath}:`, error);
        }
      }
    }
    
    return null;
  }

  private mergeWithEnvVars(yamlConfig: any): ProxyConfig {
    // Environment variables override YAML config
    return {
      server: {
        port: parseInt(process.env.PORT || yamlConfig.app?.port || String(DEFAULT_VALUES.PORT), 10),
        host: process.env.HOST || yamlConfig.app?.host || DEFAULT_VALUES.HOST,
        environment: process.env.NODE_ENV || yamlConfig.app?.environment || 'development',
      },
      rpc: {
        url: process.env.RPC_URL || yamlConfig.rpc?.url || '',
        timeout: parseInt(process.env.RPC_TIMEOUT || yamlConfig.rpc?.timeout || String(DEFAULT_VALUES.RPC_TIMEOUT), 10),
        retries: parseInt(process.env.RPC_RETRIES || yamlConfig.rpc?.retries || String(DEFAULT_VALUES.RPC_RETRIES), 10),
        initialTimeoutMs: parseInt(
          process.env.RPC_INITIAL_TIMEOUT || yamlConfig.rpc?.initial_timeout_ms || String(DEFAULT_VALUES.RPC_INITIAL_TIMEOUT),
          10
        ),
        networks: yamlConfig.rpc?.networks || {},
        batchConcurrencyLimit: parseInt(process.env.BATCH_CONCURRENCY_LIMIT || yamlConfig.rpc?.batch_concurrency_limit || '10', 10),
        batchTimeout: parseInt(process.env.BATCH_TIMEOUT || yamlConfig.rpc?.batch_timeout || '5000', 10),
      },
      cache: {
        maxAge: parseInt(process.env.CACHE_MAX_AGE || yamlConfig.cache?.ttl?.default || String(DEFAULT_VALUES.CACHE_MAX_AGE), 10),
        dbFile: process.env.DB_FILE || yamlConfig.cache?.database?.path,
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || yamlConfig.cache?.max_size || String(DEFAULT_VALUES.CACHE_MAX_SIZE), 10),
        enableDb: process.env.ENABLE_DB_CACHE === 'true' || yamlConfig.cache?.type === 'database' || yamlConfig.cache?.type === 'hybrid',
        type: process.env.CACHE_TYPE || yamlConfig.cache?.type || 'memory',
        compression: {
          enabled: process.env.ENABLE_COMPRESSION === 'true' || yamlConfig.cache?.compression?.enabled || false,
          threshold: parseInt(process.env.COMPRESSION_THRESHOLD || yamlConfig.cache?.compression?.threshold || '1024', 10),
          minRatio: parseFloat(process.env.COMPRESSION_MIN_RATIO || yamlConfig.cache?.compression?.min_ratio || '0.2'),
        },
        redis: {
          url: process.env.REDIS_URL || yamlConfig.cache?.redis?.url || 'redis://localhost:6379',
          maxMemory: process.env.REDIS_MAX_MEMORY || yamlConfig.cache?.redis?.max_memory || '2gb',
          maxMemoryPolicy: process.env.REDIS_MAX_MEMORY_POLICY || yamlConfig.cache?.redis?.max_memory_policy || 'allkeys-lru',
        },
        clickhouse: {
          url: process.env.CLICKHOUSE_URL || yamlConfig.cache?.clickhouse?.url || 'http://localhost:8123',
          database: process.env.CLICKHOUSE_DATABASE || yamlConfig.cache?.clickhouse?.database || 'rpc_cache',
          user: process.env.CLICKHOUSE_USER || yamlConfig.cache?.clickhouse?.user || 'default',
          password: process.env.CLICKHOUSE_PASSWORD || yamlConfig.cache?.clickhouse?.password || '',
        },
        ttl: {
          default: parseInt(process.env.CACHE_TTL_DEFAULT || yamlConfig.cache?.ttl?.default || '3600', 10),
          immutable: parseInt(process.env.CACHE_TTL_IMMUTABLE || yamlConfig.cache?.ttl?.immutable || '0', 10),
          blockData: parseInt(process.env.CACHE_TTL_BLOCK_DATA || yamlConfig.cache?.ttl?.block_data || '300', 10),
          logData: parseInt(process.env.CACHE_TTL_LOG_DATA || yamlConfig.cache?.ttl?.log_data || '3600', 10),
          callData: parseInt(process.env.CACHE_TTL_CALL_DATA || yamlConfig.cache?.ttl?.call_data || '0', 10),
          receiptData: parseInt(process.env.CACHE_TTL_RECEIPT_DATA || yamlConfig.cache?.ttl?.receipt_data || '0', 10),
        },
      },
      rateLimit: {
        windowMs: parseInt(
          process.env.RATE_LIMIT_WINDOW || yamlConfig.security?.rate_limit?.window_ms || String(DEFAULT_VALUES.RATE_LIMIT_WINDOW),
          10
        ),
        max: parseInt(process.env.RATE_LIMIT_MAX || yamlConfig.security?.rate_limit?.max_requests || String(DEFAULT_VALUES.RATE_LIMIT_MAX), 10),
      },
      logging: {
        level: process.env.LOG_LEVEL || yamlConfig.logging?.level || DEFAULT_VALUES.LOG_LEVEL,
        enableConsole: process.env.NODE_ENV !== 'production' || yamlConfig.logging?.console?.enabled !== false,
      },
      security: {
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || yamlConfig.server?.cors?.origin?.split(',') || [],
        enableHelmet: process.env.DISABLE_HELMET !== 'true' && yamlConfig.server?.helmet?.enabled !== false,
        enableCors: process.env.DISABLE_CORS !== 'true' && yamlConfig.server?.cors?.enabled !== false,
      },
      performance: {
        connectionPool: {
          enabled: process.env.ENABLE_CONNECTION_POOL === 'true' || yamlConfig.performance?.connection_pool?.enabled || false,
          size: parseInt(process.env.CONNECTION_POOL_SIZE || yamlConfig.performance?.connection_pool?.size || '50', 10),
          timeout: parseInt(process.env.CONNECTION_POOL_TIMEOUT || yamlConfig.performance?.connection_pool?.timeout || '30000', 10),
          keepalive: process.env.CONNECTION_POOL_KEEPALIVE === 'true' || yamlConfig.performance?.connection_pool?.keepalive || true,
        },
        circuitBreaker: {
          enabled: process.env.ENABLE_CIRCUIT_BREAKER === 'true' || yamlConfig.performance?.circuit_breaker?.enabled || false,
          threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || yamlConfig.performance?.circuit_breaker?.threshold || '5', 10),
          timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || yamlConfig.performance?.circuit_breaker?.timeout || '60000', 10),
        },
        requestQueue: {
          enabled: process.env.ENABLE_REQUEST_QUEUE === 'true' || yamlConfig.performance?.request_queue?.enabled || false,
          size: parseInt(process.env.REQUEST_QUEUE_SIZE || yamlConfig.performance?.request_queue?.size || '1000', 10),
          concurrency: parseInt(process.env.REQUEST_QUEUE_CONCURRENCY || yamlConfig.performance?.request_queue?.concurrency || '10', 10),
        },
        cacheWarming: {
          enabled: process.env.ENABLE_CACHE_WARMING === 'true' || yamlConfig.performance?.cache_warming?.enabled || false,
          interval: parseInt(process.env.CACHE_WARMING_INTERVAL || yamlConfig.performance?.cache_warming?.interval || '300000', 10),
        },
        subgraph: {
          enabled: process.env.ENABLE_SUBGRAPH_OPTIMIZATION === 'true' || yamlConfig.performance?.subgraph?.enabled || false,
          prefetch: {
            enabled: process.env.SUBGRAPH_PREFETCH_ENABLED === 'true' || yamlConfig.performance?.subgraph?.prefetch?.enabled || false,
            interval: parseInt(process.env.SUBGRAPH_PREFETCH_INTERVAL || yamlConfig.performance?.subgraph?.prefetch?.interval || '60000', 10),
          },
        },
      },
      metrics: {
        enabled: process.env.ENABLE_METRICS === 'true' || yamlConfig.metrics?.enabled || false,
        port: parseInt(process.env.METRICS_PORT || yamlConfig.metrics?.port || '3000', 10),
        path: process.env.METRICS_PATH || yamlConfig.metrics?.path || '/metrics',
      },
    };
  }

  private loadFromEnvVars(): ProxyConfig {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    return {
      server: {
        port: parseInt(process.env.PORT || String(DEFAULT_VALUES.PORT), 10),
        host: process.env.HOST || DEFAULT_VALUES.HOST,
        environment: process.env.NODE_ENV || 'development',
      },
      rpc: {
        url: process.env.RPC_URL || '',
        timeout: parseInt(process.env.RPC_TIMEOUT || String(DEFAULT_VALUES.RPC_TIMEOUT), 10),
        retries: parseInt(process.env.RPC_RETRIES || String(DEFAULT_VALUES.RPC_RETRIES), 10),
        initialTimeoutMs: parseInt(
          process.env.RPC_INITIAL_TIMEOUT || String(DEFAULT_VALUES.RPC_INITIAL_TIMEOUT),
          10
        ),
        networks: {},
        batchConcurrencyLimit: parseInt(process.env.BATCH_CONCURRENCY_LIMIT || '10', 10),
        batchTimeout: parseInt(process.env.BATCH_TIMEOUT || '5000', 10),
      },
      cache: {
        maxAge: parseInt(process.env.CACHE_MAX_AGE || String(DEFAULT_VALUES.CACHE_MAX_AGE), 10),
        dbFile: process.env.DB_FILE,
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || String(DEFAULT_VALUES.CACHE_MAX_SIZE), 10),
        enableDb: process.env.ENABLE_DB_CACHE === 'true',
        type: process.env.CACHE_TYPE || 'memory',
        compression: {
          enabled: process.env.ENABLE_COMPRESSION === 'true',
          threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024', 10),
          minRatio: parseFloat(process.env.COMPRESSION_MIN_RATIO || '0.2'),
        },
        redis: {
          url: process.env.REDIS_URL || 'redis://localhost:6379',
          maxMemory: process.env.REDIS_MAX_MEMORY || '2gb',
          maxMemoryPolicy: process.env.REDIS_MAX_MEMORY_POLICY || 'allkeys-lru',
        },
        clickhouse: {
          url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
          database: process.env.CLICKHOUSE_DATABASE || 'rpc_cache',
          user: process.env.CLICKHOUSE_USER || 'default',
          password: process.env.CLICKHOUSE_PASSWORD || '',
        },
        ttl: {
          default: parseInt(process.env.CACHE_TTL_DEFAULT || '3600', 10),
          immutable: parseInt(process.env.CACHE_TTL_IMMUTABLE || '0', 10),
          blockData: parseInt(process.env.CACHE_TTL_BLOCK_DATA || '300', 10),
          logData: parseInt(process.env.CACHE_TTL_LOG_DATA || '3600', 10),
          callData: parseInt(process.env.CACHE_TTL_CALL_DATA || '0', 10),
          receiptData: parseInt(process.env.CACHE_TTL_RECEIPT_DATA || '0', 10),
        },
      },
      rateLimit: {
        windowMs: parseInt(
          process.env.RATE_LIMIT_WINDOW || String(DEFAULT_VALUES.RATE_LIMIT_WINDOW),
          10
        ),
        max: parseInt(process.env.RATE_LIMIT_MAX || String(DEFAULT_VALUES.RATE_LIMIT_MAX), 10),
      },
      logging: {
        level: process.env.LOG_LEVEL || DEFAULT_VALUES.LOG_LEVEL,
        enableConsole: process.env.NODE_ENV !== 'production',
      },
      security: {
        allowedOrigins,
        enableHelmet: process.env.DISABLE_HELMET !== 'true',
        enableCors: process.env.DISABLE_CORS !== 'true',
      },
      performance: {
        connectionPool: {
          enabled: process.env.ENABLE_CONNECTION_POOL === 'true',
          size: parseInt(process.env.CONNECTION_POOL_SIZE || '50', 10),
          timeout: parseInt(process.env.CONNECTION_POOL_TIMEOUT || '30000', 10),
          keepalive: process.env.CONNECTION_POOL_KEEPALIVE === 'true',
        },
        circuitBreaker: {
          enabled: process.env.ENABLE_CIRCUIT_BREAKER === 'true',
          threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
          timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000', 10),
        },
        requestQueue: {
          enabled: process.env.ENABLE_REQUEST_QUEUE === 'true',
          size: parseInt(process.env.REQUEST_QUEUE_SIZE || '1000', 10),
          concurrency: parseInt(process.env.REQUEST_QUEUE_CONCURRENCY || '10', 10),
        },
        cacheWarming: {
          enabled: process.env.ENABLE_CACHE_WARMING === 'true',
          interval: parseInt(process.env.CACHE_WARMING_INTERVAL || '300000', 10),
        },
        subgraph: {
          enabled: process.env.ENABLE_SUBGRAPH_OPTIMIZATION === 'true',
          prefetch: {
            enabled: process.env.SUBGRAPH_PREFETCH_ENABLED === 'true',
            interval: parseInt(process.env.SUBGRAPH_PREFETCH_INTERVAL || '60000', 10),
          },
        },
      },
      metrics: {
        enabled: process.env.ENABLE_METRICS === 'true',
        port: parseInt(process.env.METRICS_PORT || '3000', 10),
        path: process.env.METRICS_PATH || '/metrics',
      },
    };
  }

  private validateConfig(): void {
    // rpc.url is optional in multi-network mode. Only validate if provided.
    if (this.config.rpc.url) {
      try {
        new URL(this.config.rpc.url);
      } catch {
        throw new Error('Invalid RPC_URL format. Must be a valid URL');
      }
    }

    // Validate port range
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      throw new Error('Invalid port number. Must be between 1 and 65535');
    }
  }

  getConfig(): ProxyConfig {
    return { ...this.config };
  }

  isProduction(): boolean {
    return this.config.server.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.config.server.environment === 'development';
  }
}