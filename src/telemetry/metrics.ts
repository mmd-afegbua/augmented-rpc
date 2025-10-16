import client from 'prom-client';

export class PrometheusMetrics {
	private static instance: PrometheusMetrics | undefined;
	private initialized = false;

	// Instruments
	requestsTotal!: client.Counter<string>;
	upstreamResponsesTotal!: client.Counter<string>;
	cachedResponsesTotal!: client.Counter<string>;
	cacheHitsTotal!: client.Counter<string>;
	cacheMissesTotal!: client.Counter<string>;
	requestDurationMs!: client.Histogram<string>;
	responseSizeBytes!: client.Histogram<string>;
	
	// Primary/Fallback upstream metrics
	fallbackRequestsTotal!: client.Counter<string>;
	upstreamResponseTime!: client.Histogram<string>;
	networkRequestsTotal!: client.Counter<string>;
	routingDecisionsTotal!: client.Counter<string>;
	archiveNodeRequestsTotal!: client.Counter<string>;
	
	// Cache quality metrics
	cacheInvalidEntriesTotal!: client.Counter<string>;

	static getInstance(): PrometheusMetrics {
		if (!this.instance) {
			this.instance = new PrometheusMetrics();
		}
		return this.instance;
	}

	init(): void {
		if (this.initialized) return;

		this.requestsTotal = new client.Counter({
			name: 'rpc_http_requests_total',
			help: 'Total HTTP JSON-RPC requests processed',
			labelNames: ['method', 'cache_status', 'outcome'],
		});

		this.upstreamResponsesTotal = new client.Counter({
			name: 'rpc_http_upstream_responses_total',
			help: 'Total upstream responses received',
			labelNames: ['status_code'],
		});

		this.cachedResponsesTotal = new client.Counter({
			name: 'rpc_http_cached_responses_total',
			help: 'Total cached responses served',
			labelNames: ['method'],
		});

		this.cacheHitsTotal = new client.Counter({
			name: 'rpc_cache_hits_total',
			help: 'Total cache hits',
			labelNames: ['method'],
		});

		this.cacheMissesTotal = new client.Counter({
			name: 'rpc_cache_misses_total',
			help: 'Total cache misses',
			labelNames: ['method'],
		});

		this.requestDurationMs = new client.Histogram({
			name: 'rpc_request_duration_ms',
			help: 'Duration of handling a JSON-RPC request in milliseconds',
			labelNames: ['method', 'cache_status'],
			buckets: [5, 10, 20, 50, 100, 250, 500, 1000, 2500, 5000],
		});

		this.responseSizeBytes = new client.Histogram({
			name: 'rpc_response_size_bytes',
			help: 'Size of RPC responses in bytes',
			labelNames: ['method'],
			buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
		});

		// Primary/Fallback upstream metrics
		this.fallbackRequestsTotal = new client.Counter({
			name: 'rpc_fallback_requests_total',
			help: 'Total requests that used fallback upstream',
			labelNames: ['network', 'upstream_type', 'reason'],
		});

		this.upstreamResponseTime = new client.Histogram({
			name: 'rpc_upstream_response_time_ms',
			help: 'Response time per upstream in milliseconds',
			labelNames: ['network', 'upstream_type'],
			buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
		});

		this.networkRequestsTotal = new client.Counter({
			name: 'rpc_network_requests_total',
			help: 'Total requests per network',
			labelNames: ['network', 'method'],
		});

		this.routingDecisionsTotal = new client.Counter({
			name: 'rpc_routing_decisions_total',
			help: 'Total routing decisions made',
			labelNames: ['network', 'upstream_type', 'reason'],
		});

		this.archiveNodeRequestsTotal = new client.Counter({
			name: 'rpc_archive_node_requests_total',
			help: 'Total requests that required archive node',
			labelNames: ['network', 'method'],
		});

		// Cache quality metrics
		this.cacheInvalidEntriesTotal = new client.Counter({
			name: 'rpc_cache_invalid_entries_total',
			help: 'Total invalid entries that were not cached',
			labelNames: ['network', 'method', 'reason'],
		});

		this.initialized = true;
	}

	getRegister(): typeof client.register {
		return client.register;
	}

	// Helper methods for common metric operations
	recordFallbackRequest(network: string, upstreamType: string, reason: string): void {
		this.fallbackRequestsTotal.labels(network, upstreamType, reason).inc();
	}

	recordRoutingDecision(network: string, upstreamType: string, reason: string): void {
		this.routingDecisionsTotal.labels(network, upstreamType, reason).inc();
	}

	recordArchiveNodeRequest(network: string, method: string): void {
		this.archiveNodeRequestsTotal.labels(network, method).inc();
	}

	recordNetworkRequest(network: string, method: string): void {
		this.networkRequestsTotal.labels(network, method).inc();
	}

	recordUpstreamResponseTime(network: string, upstreamType: string, duration: number): void {
		this.upstreamResponseTime.labels(network, upstreamType).observe(duration);
	}

	recordCacheInvalidEntry(network: string, method: string, reason: string): void {
		this.cacheInvalidEntriesTotal.labels(network, method, reason).inc();
	}
} 