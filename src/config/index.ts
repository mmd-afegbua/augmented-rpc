import { ProxyConfig } from '@/types/config';
import { DEFAULT_VALUES } from './constants';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Configuration Manager - Supports YAML config files with environment variable overrides
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
    // Load YAML config if it exists
    const yamlConfig = this.loadYamlConfig();
    
    // Merge with environment variables (env vars take precedence)
    return {
      server: {
        port: parseInt(process.env.PORT || yamlConfig.server?.port || String(DEFAULT_VALUES.PORT), 10),
        host: process.env.HOST || yamlConfig.server?.host || DEFAULT_VALUES.HOST,
        environment: process.env.NODE_ENV || yamlConfig.server?.environment || 'development',
      },
      rpc: {
        url: process.env.RPC_URL || yamlConfig.rpc?.url || '',
        timeout: parseInt(process.env.RPC_TIMEOUT || yamlConfig.rpc?.timeout || String(DEFAULT_VALUES.RPC_TIMEOUT), 10),
        retries: parseInt(process.env.RPC_RETRIES || yamlConfig.rpc?.retries || String(DEFAULT_VALUES.RPC_RETRIES), 10),
        initialTimeoutMs: parseInt(
          process.env.RPC_INITIAL_TIMEOUT || yamlConfig.rpc?.initial_timeout_ms || String(DEFAULT_VALUES.RPC_INITIAL_TIMEOUT),
          10
        ),
        networks: this.loadNetworks(yamlConfig.rpc?.networks),
        batchConcurrencyLimit: parseInt(process.env.BATCH_CONCURRENCY_LIMIT || yamlConfig.rpc?.batch_concurrency_limit || '10', 10),
        batchTimeout: parseInt(process.env.BATCH_TIMEOUT || yamlConfig.rpc?.batch_timeout || '5000', 10),
        upstreams: this.loadUpstreams(yamlConfig.rpc?.upstreams),
      },
      cache: {
        maxAge: parseInt(process.env.CACHE_MAX_AGE || yamlConfig.cache?.max_age || String(DEFAULT_VALUES.CACHE_MAX_AGE), 10),
        dbFile: process.env.DB_FILE || yamlConfig.cache?.db_file,
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || yamlConfig.cache?.max_size || String(DEFAULT_VALUES.CACHE_MAX_SIZE), 10),
        enableDb: process.env.ENABLE_DB_CACHE === 'true' || yamlConfig.cache?.enable_db === true,
      },
      rateLimit: {
        windowMs: parseInt(
          process.env.RATE_LIMIT_WINDOW || yamlConfig.rate_limit?.window_ms || String(DEFAULT_VALUES.RATE_LIMIT_WINDOW),
          10
        ),
        maxRequests: parseInt(
          process.env.RATE_LIMIT_MAX || yamlConfig.rate_limit?.max_requests || String(DEFAULT_VALUES.RATE_LIMIT_MAX),
          10
        ),
      },
      cors: {
        enabled: process.env.CORS_ENABLED !== 'false' && yamlConfig.cors?.enabled !== false,
        origin: process.env.CORS_ORIGIN || yamlConfig.cors?.origin || '*',
        credentials: process.env.CORS_CREDENTIALS === 'true' || yamlConfig.cors?.credentials === true,
      },
      helmet: {
        enabled: process.env.HELMET_ENABLED !== 'false' && yamlConfig.helmet?.enabled !== false,
        contentSecurityPolicy: process.env.HELMET_CSP === 'true' || yamlConfig.helmet?.content_security_policy === true,
      },
    };
  }

  private loadYamlConfig(): any {
    const configPaths = [
      path.join(process.cwd(), 'config.yaml'),
      path.join(process.cwd(), 'config.yml'),
      path.join(__dirname, '..', '..', 'config.yaml'),
      path.join(__dirname, '..', '..', 'config.yml'),
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const fileContents = fs.readFileSync(configPath, 'utf8');
          const yamlConfig = yaml.load(fileContents) as any;
          console.log(`Loaded configuration from: ${configPath}`);
          return yamlConfig || {};
        } catch (error) {
          console.warn(`Failed to load YAML config from ${configPath}:`, error);
        }
      }
    }

    return {};
  }

  private loadNetworks(yamlNetworks?: Record<string, any>): Record<string, any> {
    const networks: Record<string, any> = {};
    
    // Load from YAML config first
    if (yamlNetworks && typeof yamlNetworks === 'object') {
      for (const [key, value] of Object.entries(yamlNetworks)) {
        if (typeof value === 'string') {
          networks[key] = { 
            url: value, 
            timeout: 30000, 
            retries: 3, 
            retry_delay: 1000 
          };
        } else if (typeof value === 'object' && value !== null && 'url' in value) {
          // Load network config with fallback support
          const networkConfig = value as any;
          networks[key] = {
            url: networkConfig.url,
            timeout: networkConfig.timeout || 30000,
            retries: networkConfig.retries || 3,
            retry_delay: networkConfig.retry_delay || 1000,
            priority: networkConfig.priority || 1,
            // Network-specific fallback
            fallback_url: networkConfig.fallback_url,
            fallback_timeout: networkConfig.fallback_timeout || 30000,
            fallback_retries: networkConfig.fallback_retries || 3,
            fallback_retry_delay: networkConfig.fallback_retry_delay || 1000,
          };
        }
      }
    }
    
    // Override with environment variables if present
    if (process.env.RPC_NETWORKS) {
      try {
        const parsed = JSON.parse(process.env.RPC_NETWORKS);
        if (typeof parsed === 'object' && parsed !== null) {
          for (const [key, value] of Object.entries(parsed)) {
            if (typeof value === 'string') {
              networks[key] = { 
                url: value, 
                timeout: 30000, 
                retries: 3, 
                retry_delay: 1000 
              };
            } else if (typeof value === 'object' && value !== null && 'url' in value) {
              const networkConfig = value as any;
              networks[key] = {
                url: networkConfig.url,
                timeout: networkConfig.timeout || 30000,
                retries: networkConfig.retries || 3,
                retry_delay: networkConfig.retry_delay || 1000,
                priority: networkConfig.priority || 1,
                fallback_url: networkConfig.fallback_url,
                fallback_timeout: networkConfig.fallback_timeout || 30000,
                fallback_retries: networkConfig.fallback_retries || 3,
                fallback_retry_delay: networkConfig.fallback_retry_delay || 1000,
              };
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse RPC_NETWORKS:', e);
      }
    }
    
    return networks;
  }

  private loadUpstreams(yamlUpstreams?: any): { primary: any; fallback: any } | undefined {
    // Load from YAML config first
    if (yamlUpstreams && typeof yamlUpstreams === 'object') {
      const upstreams: { primary: any; fallback: any } = {
        primary: {
          url: yamlUpstreams.primary?.url || '',
          timeout: yamlUpstreams.primary?.timeout || 30000,
          retries: yamlUpstreams.primary?.retries || 3,
          retryDelay: yamlUpstreams.primary?.retry_delay || 1000,
          priority: yamlUpstreams.primary?.priority || 1,
        },
        fallback: {
          url: yamlUpstreams.fallback?.url || '',
          timeout: yamlUpstreams.fallback?.timeout || 30000,
          retries: yamlUpstreams.fallback?.retries || 3,
          retryDelay: yamlUpstreams.fallback?.retry_delay || 1000,
          priority: yamlUpstreams.fallback?.priority || 2,
        },
      };
      
      // Only return if both URLs are configured
      if (upstreams.primary.url && upstreams.fallback.url) {
        return upstreams;
      }
    }
    
    // Override with environment variables if present
    if (process.env.PRIMARY_RPC_URL && process.env.FALLBACK_RPC_URL) {
      return {
        primary: {
          url: process.env.PRIMARY_RPC_URL,
          timeout: parseInt(process.env.PRIMARY_RPC_TIMEOUT || '30000', 10),
          retries: parseInt(process.env.PRIMARY_RPC_RETRIES || '3', 10),
          retryDelay: parseInt(process.env.PRIMARY_RPC_RETRY_DELAY || '1000', 10),
          priority: parseInt(process.env.PRIMARY_RPC_PRIORITY || '1', 10),
        },
        fallback: {
          url: process.env.FALLBACK_RPC_URL,
          timeout: parseInt(process.env.FALLBACK_RPC_TIMEOUT || '30000', 10),
          retries: parseInt(process.env.FALLBACK_RPC_RETRIES || '3', 10),
          retryDelay: parseInt(process.env.FALLBACK_RPC_RETRY_DELAY || '1000', 10),
          priority: parseInt(process.env.FALLBACK_RPC_PRIORITY || '2', 10),
        },
      };
    }
    
    return undefined;
  }

  private validateConfig(): void {
    if (!this.config.rpc.url && Object.keys(this.config.rpc.networks).length === 0) {
      console.warn('Warning: No RPC URL configured. Set RPC_URL environment variable or configure networks in config.yaml');
    }
  }

  getConfig(): ProxyConfig {
    return this.config;
  }
}

export { DEFAULT_VALUES } from './constants';