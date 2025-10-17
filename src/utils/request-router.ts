import { JSONRPCRequest } from '@/types';
import { Logger } from './logger';

export interface UpstreamConfig {
  url: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  priority?: number;
}

export interface RequestRoutingDecision {
  upstream: UpstreamConfig;
  reason: string;
}

export class RequestRouter {
  private readonly globalUpstreams?: { primary: UpstreamConfig; fallback: UpstreamConfig };
  private readonly networks: Record<string, any>;

  constructor(
    globalUpstreams: { primary: UpstreamConfig; fallback: UpstreamConfig } | undefined,
    networks: Record<string, any>,
    _logger: Logger
  ) {
    this.globalUpstreams = globalUpstreams;
    this.networks = networks;
  }

  /**
   * Determine which upstream to use for a given request
   * Always starts with primary, fallback happens on error
   */
  routeRequest(networkKey?: string): RequestRoutingDecision {
    // If we have a specific network, use its primary URL
    if (networkKey && this.networks[networkKey]) {
      return {
        upstream: {
          url: this.networks[networkKey].url,
          timeout: this.networks[networkKey].timeout,
          retries: this.networks[networkKey].retries,
          retryDelay: this.networks[networkKey].retry_delay,
          priority: this.networks[networkKey].priority
        },
        reason: `Using ${networkKey} network primary upstream`
      };
    }

    // Fall back to global primary upstream
    if (this.globalUpstreams) {
      return {
        upstream: this.globalUpstreams.primary,
        reason: 'Using global primary upstream'
      };
    }

    throw new Error('No upstream configuration available');
  }

  /**
   * Check if an error or null result indicates the request needs archive node access
   */
  shouldFallbackToArchive(error: any, request: JSONRPCRequest, response?: any): boolean {
    // Check for null results on historical data requests
    if (response && response.result === null) {
      // For historical block requests, null might mean data not available on regular node
      if (request.method === 'eth_getBlockByNumber') {
        const params = Array.isArray(request.params) ? request.params : [];
        const blockParam = params[0];
        // If it's a specific block number (not 'latest' or 'pending'), try archive
        if (typeof blockParam === 'string' && blockParam.startsWith('0x') && blockParam !== 'latest' && blockParam !== 'pending') {
          return true;
        }
      }
      
      // For historical logs, null might mean data not available
      if (request.method === 'eth_getLogs') {
        return true;
      }
      
      // For historical transaction receipts
      if (request.method === 'eth_getTransactionReceipt') {
        return true;
      }
    }

    // Check for common "data not available" errors
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorData = error?.data?.toLowerCase() || '';
    
    // Common error patterns that indicate archive node is needed
    const archiveErrorPatterns = [
      'block not found',
      'transaction not found',
      'receipt not found',
      'logs not found',
      'state not found',
      'data not available',
      'block range not available',
      'historical data not available',
      'only recent blocks available',
      'archive node required'
    ];

    // Block tolerance error patterns that indicate RPC provider sync issues
    const blockTolerancePatterns = [
      'block.*returned.*is after.*last block',
      'non-deterministic error',
      'block.*is after.*requested range',
      'block ordering error',
      'deterministic error'
    ];

    const needsArchive = archiveErrorPatterns.some(pattern => 
      errorMessage.includes(pattern) || errorData.includes(pattern)
    );

    const hasBlockToleranceIssue = blockTolerancePatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(errorMessage) || regex.test(errorData);
    });

    // For eth_call with "latest" block tag, also check for block tolerance issues
    if (request.method === 'eth_call' && Array.isArray(request.params) && request.params.length >= 2) {
      const blockTag = request.params[1];
      if (blockTag === 'latest' && hasBlockToleranceIssue) {
        return true;
      }
    }

    return needsArchive || hasBlockToleranceIssue;
  }

  /**
   * Get fallback upstream for when primary fails
   */
  getFallbackUpstream(networkKey?: string): UpstreamConfig {
    // If we have a specific network with its own fallback
    if (networkKey && this.networks[networkKey] && this.networks[networkKey].fallback_url) {
      return {
        url: this.networks[networkKey].fallback_url,
        timeout: this.networks[networkKey].fallback_timeout,
        retries: this.networks[networkKey].fallback_retries,
        retryDelay: this.networks[networkKey].fallback_retry_delay,
        priority: 2
      };
    }

    // Fall back to global fallback upstream
    if (this.globalUpstreams) {
      return this.globalUpstreams.fallback;
    }

    throw new Error('No fallback upstream available');
  }

  /**
   * Get primary upstream
   */
  getPrimaryUpstream(networkKey?: string): UpstreamConfig {
    return this.routeRequest(networkKey).upstream;
  }
}
