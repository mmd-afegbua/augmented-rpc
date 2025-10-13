# Augmented RPC Proxy

A high-performance, production-ready JSON-RPC proxy optimized for **subgraph syncing** and general EVM blockchain interactions. Features intelligent caching, multi-network routing, and advanced performance optimizations.

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

**1. Clone and Setup**
```bash
git clone <your-repo>
cd augmented-rpc
```

**2. Configure Environment**

**Option A: YAML Configuration (Recommended)**
```bash
# Edit the YAML configuration file
nano config.yaml

# Or create a custom config
cp config.yaml config.custom.yaml
nano config.custom.yaml
```

**Option B: Environment Variables**
```bash
# Copy Docker environment template
cp env.docker .env

# Edit .env with your RPC URLs
nano .env
```

**3. Start Everything**
```bash
# Start all services (RPC proxy + ClickHouse + Redis)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f rpc-proxy
```

**4. Test Your Setup**
```bash
# Test basic functionality
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}'

# Test multi-network (if configured)
curl -X POST http://localhost:3000/base-mainnet \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}'
```

### Option 2: Local Development

**1. Install Dependencies**
```bash
npm install
```

**2. Configure Your RPC URLs**

**Option A: Single RPC (Simple)**
```bash
RPC_URL=https://mainnet.base.org npm run start
```

**Option B: Multi-Network (Recommended)**
Create `rpc.networks.json`:
```json
{
  "base-mainnet": "https://mainnet.base.org",
  "polygon-mainnet": "https://polygon-rpc.com",
  "ethereum-mainnet": "https://mainnet.infura.io/v3/YOUR_KEY"
}
```

Then start:
```bash
npm run start
```

**3. Test Your Setup**
```bash
# Test basic functionality
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}'

# Test multi-network (if configured)
curl -X POST http://localhost:3000/base-mainnet \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}'
```

## 🐳 Docker Compose Services

The Docker Compose setup includes:

- **rpc-proxy**: The main Augmented RPC Proxy application
- **clickhouse**: ClickHouse database for persistent caching (handles 800GB+ data)
- **redis**: Redis for hot caching (recent data, sub-millisecond access)

### Service Ports
- **RPC Proxy**: `http://localhost:3000`
- **ClickHouse HTTP**: `http://localhost:8123`
- **ClickHouse Native**: `localhost:9000`
- **Redis**: `localhost:6379`

### Docker Commands
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f rpc-proxy
docker-compose logs -f clickhouse
docker-compose logs -f redis

# Restart a service
docker-compose restart rpc-proxy

# Scale services (if needed)
docker-compose up -d --scale rpc-proxy=3

# Clean up volumes (removes all cached data)
docker-compose down -v
```

### Configuration Options

**YAML Configuration (Recommended)**
The `config.yaml` file provides a comprehensive template with all configuration options:

```bash
# Edit the configuration directly
nano config.yaml

# Or create a custom config
cp config.yaml config.custom.yaml
nano config.custom.yaml
```

Key sections in the YAML config:
- **app**: Basic application settings (port, environment, logging)
- **rpc**: RPC endpoints and network configuration
- **cache**: Cache strategy and TTL settings
- **performance**: Connection pooling, circuit breaker, request queuing
- **metrics**: Prometheus metrics configuration
- **security**: Rate limiting and authentication
- **monitoring**: Health checks and alerting

**Environment Variables (Alternative)**
Copy `env.docker` to `.env` and customize:
```bash
cp env.docker .env
nano .env
```

Key settings:
- `CONFIG_FILE`: Path to YAML config file
- `RPC_URL`: Your upstream RPC endpoint
- `REDIS_URL`: Redis connection (default: `redis://redis:6379`)
- `CLICKHOUSE_URL`: ClickHouse connection (default: `http://clickhouse:8123`)
- `CACHE_TYPE`: Set to `hybrid` for Redis + ClickHouse

**Configuration Priority:**
1. Environment variables (highest priority)
2. YAML configuration file
3. Default values (lowest priority)

## 🚀 GitHub Actions CI/CD

This repository includes comprehensive GitHub Actions workflows for automated building, testing, and deployment:

### **Workflows Overview**

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **Docker Build** | Push to `main`, tags, PRs to `main` | Build and push Docker images to GitHub Container Registry |
| **Development Build** | PRs to `main` | Quick build and test for development |
| **Test Suite** | Push to `main`, PRs to `main` | Comprehensive testing with Redis and ClickHouse |

### **Docker Images**

Images are automatically built and pushed to GitHub Container Registry:

```bash
# Pull latest image
docker pull ghcr.io/your-username/augmented-rpc:latest

# Run with Docker Compose
docker-compose up -d

# Run standalone
docker run -p 3000:3000 ghcr.io/your-username/augmented-rpc:latest
```

### **Image Tags**

- `latest` - Latest from main branch
- `develop` - Latest from develop branch  
- `v1.0.0` - Semantic version tags
- `main-abc1234` - Commit SHA tags
- `pr-123` - Pull request tags

### **Security Features**

- **Multi-platform builds**: linux/amd64, linux/arm64
- **Vulnerability scanning**: Trivy security scanner
- **Artifact attestation**: Build provenance verification
- **Automated releases**: Tagged releases with release notes

### **Local Development**

```bash
# Test locally before pushing
docker-compose up -d
./test-augmented-rpc.sh

# Build local image
docker build -t augmented-rpc:local .
```

### **GitHub Actions Usage**

**For Development:**
```bash
# Create feature branch
git checkout -b feature/new-feature
git push origin feature/new-feature

# Create pull request to main
# Triggers: Development build + Test suite
```

**For Production:**
```bash
# Push to main branch
git push origin main
# Triggers: Full build + Test suite + Security scan

# Create release
git tag v1.0.0
git push origin v1.0.0
# Triggers: Release creation with Docker image
```

**Pull Requests:**
- **PR to main**: Development build + test suite + security scan

This proxy is specifically optimized for subgraph workloads:

- **10-100x faster cache hits** than cache misses
- **Intelligent caching** for immutable blockchain data
- **Batch request processing** with parallel execution
- **Block range optimization** for `eth_getLogs` queries
- **Predictive prefetching** based on request patterns
- **Connection pooling** per network for optimal performance

## 📋 Configuration Options

### Essential Settings
```bash
# Server
PORT=3000                    # Server port (default: 3000)
HOST=0.0.0.0                # Bind address (default: 0.0.0.0)

# Logging
LOG_LEVEL=info              # error, warn, info, debug (default: info)

# Caching
CACHE_MAX_SIZE=10000        # In-memory cache size (default: 10000)
CACHE_MAX_AGE=10            # Cache TTL in seconds (default: 10)
ENABLE_DB_CACHE=true        # Enable SQLite cache (default: false)
DB_FILE=./cache.sqlite      # SQLite file path

# Performance
BATCH_CONCURRENCY_LIMIT=10  # Max concurrent batch requests
ENABLE_CACHE_WARMING=true  # Enable proactive cache warming
```

### Advanced Settings
```bash
# RPC Configuration
RPC_TIMEOUT=30000           # Upstream timeout (ms)
RPC_RETRIES=10              # Max retry attempts
RPC_INITIAL_TIMEOUT=2000    # Initial retry delay (ms)

# Security
ALLOWED_ORIGINS=*           # CORS origins (comma-separated)
DISABLE_HELMET=false       # Disable security headers
DISABLE_CORS=false         # Disable CORS
```

## 🔧 Usage Examples

### Basic RPC Calls
```bash
# Get latest block number
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}'

# Get logs (perfect for subgraphs)
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getLogs",
    "params": [{
      "fromBlock": "0x1000000",
      "toBlock": "0x1000100",
      "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    }],
    "id": 2
  }'
```

### Batch Requests (High Performance)
```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '[
    {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1},
    {"jsonrpc": "2.0", "method": "eth_chainId", "params": [], "id": 2},
    {"jsonrpc": "2.0", "method": "net_version", "params": [], "id": 3}
  ]'
```

### Multi-Network Requests
```bash
# Base network
curl -X POST http://localhost:3000/base-mainnet \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}'

# Polygon network
curl -X POST http://localhost:3000/polygon-mainnet \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}'
```

## 📊 Monitoring & Health Checks

### Health Check
```bash
curl http://localhost:3000/health
```

### Cache Statistics
```bash
curl http://localhost:3000/stats
```

### Prometheus Metrics
```bash
curl http://localhost:3000/metrics
```

### Clear Cache (if needed)
```bash
curl -X POST http://localhost:3000/cache/clear
```

## 🚀 Performance Features

### Intelligent Caching
- **Immutable data**: `eth_chainId`, `net_version`, `eth_getTransactionReceipt` cached forever
- **Time-sensitive data**: `eth_blockNumber`, `eth_call` cached with TTL
- **Smart invalidation**: Cache automatically invalidates when new blocks arrive
- **Memory + Database**: Fast memory cache with persistent SQLite backup

### Subgraph Optimizations
- **Block range merging**: Combines overlapping `eth_getLogs` requests
- **Predictive prefetching**: Learns patterns and prefetches likely requests
- **Stream processing**: Handles large responses efficiently
- **Duplicate detection**: Prevents redundant requests

### Advanced Performance
- **Connection pooling**: Reuses HTTP connections per network
- **Circuit breaker**: Automatic failure detection and recovery
- **Request queuing**: Rate limiting and priority processing
- **Batch processing**: Parallel execution of multiple requests
- **Response compression**: Automatic gzip compression

## 📈 Expected Performance

### Cache Performance
- **Cache Miss**: ~1000-2000ms (upstream RPC call)
- **Cache Hit**: ~0.1-1ms (optimized cache lookup)
- **Speedup**: **1000-20000x faster** for cache hits

### Subgraph Syncing
- **10-100x faster** than direct RPC calls
- **95%+ cache hit rate** for repeated queries
- **Parallel processing** of batch requests
- **Intelligent prefetching** reduces wait times

## 🔍 Troubleshooting

### Common Issues

**"No RPC URL configured"**
```bash
# Solution: Either set RPC_URL or create rpc.networks.json
RPC_URL=https://your-rpc-url.com npm run start
# OR create rpc.networks.json with your networks
```

**"Address already in use"**
```bash
# Solution: Use a different port
PORT=3001 npm run start
```

**Slow performance**
```bash
# Solution: Enable database cache for persistence
ENABLE_DB_CACHE=true DB_FILE=./cache.sqlite npm run start
```

**CORS errors**
```bash
# Solution: Configure allowed origins
ALLOWED_ORIGINS=https://yourdomain.com,https://anotherdomain.com npm run start
```

### Debug Mode
```bash
# Enable detailed logging
LOG_LEVEL=debug npm run start
```

## 🛠️ Development

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Run Tests
```bash
./test-augmented-rpc.sh
```

## 📚 API Reference

### Endpoints
- `POST /` - Single RPC proxy
- `POST /:network` - Multi-network RPC proxy
- `GET /health` - Health check
- `GET /stats` - Proxy statistics
- `GET /metrics` - Prometheus metrics
- `POST /cache/clear` - Clear cache

### Caching Behavior
- **Infinitely cached**: `eth_chainId`, `net_version`, `eth_getTransactionReceipt`
- **Time-cached**: `eth_blockNumber`, `eth_call`, `eth_getLogs`
- **Smart invalidation**: Automatic cache invalidation on new blocks

## 📄 License
ISC

---

**Ready to supercharge your subgraph syncing?** Start with the Quick Start guide above! 🚀