import axios, { AxiosResponse, AxiosError } from 'axios';
import { JSONRPCRequest, JSONRPCResponse } from '@/types';
import { ProxyConfig } from '@/types/config';
import { Logger } from '@/utils/logger';
import { ConnectionPoolManager } from '@/utils/connection-pool';

/**
 * HTTP Client with Retry Logic and Exponential Backoff
 */
export class HTTPClient {
  private config: ProxyConfig;
  private logger: Logger;
  private connectionPool?: ConnectionPoolManager;

  constructor(config: ProxyConfig, logger: Logger, connectionPool?: ConnectionPoolManager) {
    this.config = config;
    this.logger = logger;
    this.connectionPool = connectionPool;
  }

  async makeRequest(
    requestBody: JSONRPCRequest,
    retries: number = this.config.rpc.retries,
    timeoutMs: number = this.config.rpc.initialTimeoutMs,
    targetUrl?: string,
    networkKey?: string
  ): Promise<AxiosResponse<JSONRPCResponse>> {
    const startTime = Date.now();
    
    // Simple fallback logic for networks
    if (networkKey && this.config.rpc.networks[networkKey]) {
      const networkConfig = this.config.rpc.networks[networkKey];
      
      // Try primary first
      let response: AxiosResponse<JSONRPCResponse>;
      let upstreamUsed = 'primary';
      
      try {
        response = await this.tryUpstream(requestBody, networkConfig.primary.url, networkKey);
        
        // Smart fallback logic for subgraph syncing
        const shouldTryFallback = this.shouldTryFallback(requestBody, response.data);
        
        // 🔍 DEBUG: Log fallback decision
        this.logger.info('🔍 FALLBACK DEBUG', {
          method: requestBody.method,
          requestId: requestBody.id,
          networkKey,
          shouldTryFallback,
          hasFallback: !!networkConfig.fallback,
          primaryErrorCode: response.data?.error?.code,
          primaryErrorMessage: response.data?.error?.message,
          primaryHasResult: response.data?.result !== null,
          primaryResult: response.data?.result
        });
        
        if (shouldTryFallback && networkConfig.fallback) {
          this.logger.info('Primary returned historical data error, trying fallback', {
            method: requestBody.method,
            requestId: requestBody.id,
            networkKey,
            error: response.data?.error,
            primaryUrl: networkConfig.primary.url,
            fallbackUrl: networkConfig.fallback.url
          });
          
          try {
            response = await this.tryUpstream(requestBody, networkConfig.fallback.url, networkKey);
            upstreamUsed = 'fallback'; // Always mark as fallback if we tried it
          } catch (fallbackError) {
            this.logger.debug('Fallback upstream failed', {
              method: requestBody.method,
              requestId: requestBody.id,
              networkKey,
              fallbackUrl: networkConfig.fallback.url,
              error: (fallbackError as Error).message
            });
            // If fallback fails completely, keep the original primary response
          }
        }
      } catch (primaryError) {
        this.logger.debug('Primary upstream failed', {
          method: requestBody.method,
          requestId: requestBody.id,
          networkKey,
          primaryUrl: networkConfig.primary.url,
          error: (primaryError as Error).message
        });
        
        // Try fallback if primary fails
        if (networkConfig.fallback) {
          try {
            response = await this.tryUpstream(requestBody, networkConfig.fallback.url, networkKey);
            upstreamUsed = 'fallback';
          } catch (fallbackError) {
            this.logger.debug('Fallback upstream failed', {
              method: requestBody.method,
              requestId: requestBody.id,
              networkKey,
              fallbackUrl: networkConfig.fallback.url,
              error: (fallbackError as Error).message
            });
            throw primaryError; // If fallback fails, throw original primary error
          }
        } else {
          throw primaryError;
        }
      }
      
      // Log which upstream was used
      this.logger.info('RPC request completed', {
        method: requestBody.method,
        requestId: requestBody.id,
        networkKey,
        upstreamUsed,
        hasResult: response.data && response.data.result !== null,
        hasError: response.data && response.data.error !== undefined,
        errorCode: response.data?.error?.code
      });
      
      return response;
    }
    
    // Fallback to single URL
    const url = targetUrl || this.config.rpc.url;
    
    // Get appropriate agent for the network
    let httpAgent, httpsAgent;
    if (this.connectionPool && networkKey) {
      const agent = this.connectionPool.getAgentForNetwork(networkKey);
      httpAgent = agent.httpAgent;
      httpsAgent = agent.httpsAgent;
    }
    
    try {
      const response = await axios.post<JSONRPCResponse>(
        url,
        requestBody,
        {
          timeout: this.config.rpc.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'RPC-Proxy/1.0.0',
          },
          httpAgent,
          httpsAgent,
          // Disable automatic JSON parsing to handle malformed responses
          transformResponse: [(data) => {
            try {
              return JSON.parse(data);
            } catch {
              return data;
            }
          }],
        }
      );

      const duration = Date.now() - startTime;
      this.logger.debug('Upstream request successful', {
        method: requestBody.method,
        requestId: requestBody.id,
        duration,
        statusCode: response.status,
      });

      return response;
    } catch (error) {
      const axiosError = error as AxiosError;
      const duration = Date.now() - startTime;
      
      this.logger.debug('Upstream request failed', {
        error: axiosError.message,
        method: requestBody.method,
        requestId: requestBody.id,
        duration,
        retriesLeft: retries,
        nextTimeoutMs: timeoutMs,
      });

      // Don't retry on certain error types
      if (this.shouldNotRetry(axiosError)) {
        throw this.formatError(axiosError);
      }

      if (retries > 0) {
        // Exponential backoff with jitter
        const jitter = Math.random() * 0.1 * timeoutMs; // Up to 10% jitter
        const actualDelay = timeoutMs + jitter;
        
        this.logger.debug('Retrying upstream request', {
          method: requestBody.method,
          requestId: requestBody.id,
          delayMs: Math.round(actualDelay),
          retriesLeft: retries - 1,
        });

        await new Promise(resolve => setTimeout(resolve, actualDelay));
        return this.makeRequest(requestBody, retries - 1, timeoutMs * 2, url);
      }

      throw this.formatError(axiosError);
    }
  }

  private shouldNotRetry(error: AxiosError): boolean {
    if (error.response?.status) {
      const status = error.response.status;
      
      if (status === 401 || status === 403) {
        return true;
      }
    
      if (status === 400) {
        return true;
      }
      
      if (status >= 400 && status < 500 && status !== 429) {
        return true;
      }
    }

    return false;
  }

  private formatError(axiosError: AxiosError): Error {
    let errorMessage = 'Unspecified upstream error';
    
    if (axiosError.response) {
      const { status, statusText, data } = axiosError.response;
      errorMessage = `HTTP ${status} ${statusText}`;
      
      if (data && typeof data === 'object') {
        try {
          errorMessage += `: ${JSON.stringify(data)}`;
        } catch {
          errorMessage += `: ${String(data)}`;
        }
      }
    } else if (axiosError.request) {
      if (axiosError.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout - upstream server did not respond in time';
      } else if (axiosError.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused - upstream server is not accessible';
      } else if (axiosError.code === 'ENOTFOUND') {
        errorMessage = 'DNS resolution failed - upstream server hostname not found';
      } else {
        errorMessage = 'No response received from upstream server';
      }
    } else {
      errorMessage = axiosError.message || 'Unknown network error';
    }

    const error = new Error(errorMessage);
    error.name = 'UpstreamError';
    
    // Attach original error for debugging
    (error as any).originalError = axiosError;
    (error as any).isRetryable = !this.shouldNotRetry(axiosError);

    return error;
  }

  // Smart fallback logic for subgraph syncing
  private shouldTryFallback(requestBody: JSONRPCRequest, responseData: any): boolean {
    // Subgraph-critical methods that need fallback
    const subgraphCriticalMethods = [
      'eth_call',
      'eth_getLogs', 
      'eth_getBlockByNumber',
      'eth_getBlockByHash',
      'eth_getBlockReceipts',
      'eth_getTransactionReceipt',
      'eth_getStorageAt',
      'eth_getBalance'
    ];
    
    if (!subgraphCriticalMethods.includes(requestBody.method)) {
      this.logger.info('❌ METHOD NOT CRITICAL', { method: requestBody.method });
      return false;
    }
    
    const params = Array.isArray(requestBody.params) ? requestBody.params : [];
    
    // Check if it's a historical request (not "latest" or "pending")
    const isHistorical = this.isHistoricalRequest(params);
    
    this.logger.info('🔍 HISTORICAL CHECK', {
      method: requestBody.method,
      params: params,
      isHistorical,
      errorCode: responseData?.error?.code,
      errorMessage: responseData?.error?.message,
      hasResult: responseData?.result !== undefined,
      result: responseData?.result
    });
    
    if (isHistorical) {
      // Try fallback for JSON-RPC errors on historical calls
      if (responseData?.error?.code === -32000) {
        this.logger.info('✅ FALLBACK TRIGGERED: -32000 missing trie node error');
        return true; // "missing trie node" error
      }
      
      // Try fallback for other common historical data errors
      if (responseData?.error?.code === -32801) {
        this.logger.info('✅ FALLBACK TRIGGERED: -32801 no historical RPC available error');
        return true; // "no historical RPC available" error
      }
      
      // Try fallback for empty results on historical requests
      if (responseData?.result === null || responseData?.result === undefined) {
        this.logger.info('✅ FALLBACK TRIGGERED: null/undefined result on historical request');
        return true; // Missing data
      }
      
      // For eth_getLogs, try fallback if empty array (might indicate missing events)
      if (requestBody.method === 'eth_getLogs' && Array.isArray(responseData?.result) && responseData.result.length === 0) {
        this.logger.info('✅ FALLBACK TRIGGERED: empty eth_getLogs result');
        return true; // Empty logs might indicate missing events
      }
    }
    
    this.logger.info('❌ NO FALLBACK TRIGGERED', {
      method: requestBody.method,
      isHistorical,
      errorCode: responseData?.error?.code,
      hasResult: responseData?.result !== undefined
    });
    
    return false;
  }

  private isHistoricalRequest(params: any[]): boolean {
    // Check for historical block parameters
    const historicalBlockParams = ['fromBlock', 'toBlock', 'blockNumber', 'blockHash'];
    
    this.logger.info('🔍 CHECKING IF HISTORICAL', { params });
    
    for (const param of params) {
      if (typeof param === 'string') {
        // Check if it's a specific block number/hash (not "latest" or "pending")
        if (param !== 'latest' && param !== 'pending' && param.startsWith('0x')) {
          this.logger.info('✅ FOUND HISTORICAL BLOCK PARAM', { param });
          return true;
        }
      }
      
      if (typeof param === 'object' && param !== null) {
        // Check object parameters for historical blocks
        for (const key of historicalBlockParams) {
          if (param[key] && param[key] !== 'latest' && param[key] !== 'pending') {
            this.logger.info('✅ FOUND HISTORICAL OBJECT PARAM', { key, value: param[key] });
            return true;
          }
        }
      }
    }
    
    this.logger.info('❌ NOT HISTORICAL REQUEST', { params });
    return false;
  }

  // Simple upstream try method
  private async tryUpstream(
    requestBody: JSONRPCRequest,
    url: string,
    networkKey: string
  ): Promise<AxiosResponse<JSONRPCResponse>> {
    // Get appropriate agent for the network
    let httpAgent, httpsAgent;
    if (this.connectionPool) {
      const agent = this.connectionPool.getAgentForNetwork(networkKey);
      httpAgent = agent.httpAgent;
      httpsAgent = agent.httpsAgent;
    }
    
    return await axios.post<JSONRPCResponse>(
      url,
      requestBody,
      {
        timeout: this.config.rpc.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RPC-Proxy/1.0.0',
        },
        httpAgent,
        httpsAgent,
        validateStatus: (status) => status < 500,
      }
    );
  }

  // Health check method for upstream connectivity
  async healthCheck(timeoutMs: number = 5000, targetUrl?: string): Promise<boolean> {
    try {
      const testRequest: JSONRPCRequest = {
        jsonrpc: '2.0',
        method: 'net_version',
        id: 'health-check',
      };

      await axios.post(targetUrl || this.config.rpc.url, testRequest, {
        timeout: timeoutMs,
        headers: { 'Content-Type': 'application/json' },
      });

      return true;
    } catch {
      return false;
    }
  }

  getClientInfo(): { url: string; timeout: number; retries: number } {
    return {
      url: this.config.rpc.url,
      timeout: this.config.rpc.timeout,
      retries: this.config.rpc.retries,
    };
  }
}
