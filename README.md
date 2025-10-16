# Augmented RPC Proxy

A high-performance JSON-RPC proxy optimized for **subgraph syncing** and EVM blockchain interactions.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy and configure (minimal setup)
cp config.sample.yaml config.yaml
# Edit config.yaml with your upstream URLs

# Build and run
npm run build
npm start
```

### Quick Configuration

For the primary/fallback upstream system, you only need to configure:

```yaml
rpc:
  upstreams:
    primary:
      url: "https://mainnet.base.org"  # Primary upstream (typically non-archive)
    fallback:
      url: "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY"  # Fallback upstream (typically archive)
```

All other settings use sensible defaults. See `config.sample.yaml` for all available options.

## 🔄 Primary/Fallback Upstream System

The proxy now supports intelligent fallback between primary and fallback upstreams to ensure data availability and optimize performance.

### Key Features

- **Automatic Fallback**: Automatically falls back to secondary upstream when primary fails
- **Error-Based Detection**: Detects when data is not available on primary node
- **Smart Error Analysis**: Analyzes error messages to determine if fallback is needed
- **Performance Optimization**: Uses primary upstream for all requests, falls back only when needed
- **Transparent Operation**: No upfront prediction required - system learns from actual responses

### How It Works

1. **Primary First**: All requests start with the primary upstream
2. **Error Detection**: When primary fails, the system analyzes the error message
3. **Smart Fallback**: If the error indicates data is not available (e.g., "block not found", "historical data not available"), it automatically tries the fallback upstream
4. **Transparent Recovery**: Users get the data they need without knowing which upstream provided it

### Error Patterns That Trigger Fallback

The system detects these error patterns and automatically falls back:
- "block not found"
- "transaction not found" 
- "receipt not found"
- "logs not found"
- "state not found"
- "data not available"
- "block range not available"
- "historical data not available"
- "only recent blocks available"
- "archive node required"

### Configuration

Configure primary/fallback upstreams in your `config.yaml`:

```yaml
rpc:
  upstreams:
    primary:
      url: "https://mainnet.base.org"  # Primary upstream (typically non-archive)
      timeout: 30000
      retries: 3
      retry_delay: 1000
      priority: 1
    fallback:
      url: "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY"  # Fallback upstream (typically archive)
      timeout: 30000
      retries: 3
      retry_delay: 1000
      priority: 2
```

### Environment Variables

You can also configure upstreams via environment variables:

```bash
# Primary upstream (typically non-archive)
PRIMARY_RPC_URL="https://mainnet.base.org"
PRIMARY_RPC_TIMEOUT="30000"
PRIMARY_RPC_RETRIES="3"

# Fallback upstream (typically archive)
FALLBACK_RPC_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_KEY"
FALLBACK_RPC_TIMEOUT="30000"
FALLBACK_RPC_RETRIES="3"
```

### Testing the System

Use the provided test script to verify the routing behavior:

```bash
./test-fallback-system.sh
```

This will test various request types and show which upstream is being used for each request.

## ⚙️ Configuration

### Minimal Configuration

The proxy uses sensible defaults for most settings. You only need to configure the essential parts:

```yaml
# Minimal config.yaml - only essential settings
rpc:
  upstreams:
    primary:
      url: "https://mainnet.base.org"  # Non-archive node
      is_archive: false
    fallback:
      url: "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY"  # Archive node
      is_archive: true
```

### Full Configuration Options

For advanced setups, see `config.sample.yaml` which includes all available options with clear comments indicating what's required vs optional.


### Configuration File Locations

The system looks for configuration files in this order:
1. `./config.yaml` (project root)
2. `./config.yml` (project root)
3. `../config.yaml` (relative to dist)
4. `../config.yml` (relative to dist)

### Environment Variables (Override YAML)

Environment variables override YAML settings:

```bash
PORT=3000                    # Server port
RPC_URL=https://...          # Single RPC endpoint
CACHE_MAX_AGE=300000         # Cache TTL (milliseconds)
ENABLE_DB_CACHE=true         # Enable SQLite cache
CORS_ENABLED=false           # Disable CORS
HELMET_ENABLED=false         # Disable security headers
```

**Note**: Multi-network configuration is now handled through YAML only. Environment variable `RPC_NETWORKS` is deprecated.

## 🎯 Subgraph Optimizations

- **10-100x faster cache hits** than cache misses
- **Intelligent caching** for immutable blockchain data
- **Batch request processing** with parallel execution
- **Block range optimization** for `eth_getLogs` queries

## 📊 Usage

```bash
# Test basic functionality
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}'

# Test multi-network
curl -X POST http://localhost:3000/base-mainnet \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}'

# Test batch requests
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '[
    {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1},
    {"jsonrpc": "2.0", "method": "eth_gasPrice", "params": [], "id": 2}
  ]'
```

## 📈 Metrics

- **Health**: `http://localhost:3000/health`
- **Metrics**: `http://localhost:3000/metrics`
- **Stats**: `http://localhost:3000/stats`

## 🧪 Testing

```bash
./test-augmented-rpc.sh
```

Perfect for subgraph syncing workloads that need fast, reliable RPC access with intelligent caching.