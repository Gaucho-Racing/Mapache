# Query Service

FastAPI-based query service for Gaucho Racing's Mapache telemetry system.

## 🚀 Quick Start (No Local Python Install Required!)

All development happens in isolated Docker containers. No Poetry, no local Python needed!

```bash
# 1. Start all Mapache services
docker compose up -d

# 2. Stop the docker-compose query container
docker stop query

# 3. Build and run query in isolated container
cd query
make build
make run

# 4. Edit code in query/query/* then rebuild to see changes
make rebuild
```

## 📋 Available Commands

Run `make` or `make help` to see all commands:

| Command | Description |
|---------|-------------|
| `make build` | Build query Docker image |
| `make run` | Run query in isolated Docker container |
| `make stop` | Stop the local query container |
| `make logs` | Follow query container logs |
| `make rebuild` | Rebuild and restart query container |
| `make clean` | Clean up containers and files |

## 🔧 Development Workflow

### 1. Start All Mapache Services
```bash
docker compose up -d
```

### 2. Stop Docker-Compose Query Container
```bash
docker stop query
```

### 3. Build Query Image
```bash
cd query
make build
```

### 4. Run Query in Isolated Container
```bash
make run
```
This creates a `query-dev` container that:
- Connects to other services (rincon, auth, etc.) via Docker network
- Mounts your local code as a volume
- Runs completely isolated from docker-compose

### 5. View Logs
```bash
make logs
```

### 6. Edit Code
- Edit any Python files in `query/query/*`
- Run `make rebuild` to see changes
- The container rebuilds and restarts with your updates

### 7. When Done
```bash
make stop
```

## 🏗️ Architecture

The query service runs in its own Docker container with:
- ✅ **No Poetry**: Uses pip and requirements.txt
- ✅ **Volume Mount**: `./query/query:/app/query` for code access
- ✅ **Network**: Connected to `mapache_default` network
- ✅ **Isolated**: Separate from docker-compose query service
- ✅ **No Local Install**: Everything runs in Docker

## 📦 Dependencies

Managed via `requirements.txt` (no Poetry needed):
- FastAPI
- Uvicorn
- SQLAlchemy
- PyJWT
- And more...

To add dependencies:
1. Edit `requirements.txt`
2. Run `make rebuild`

## 🐛 Troubleshooting

### Service won't start?
```bash
make logs  # Check for errors
make stop  # Stop container
make run   # Start fresh
```

### Port already in use?
```bash
# Make sure docker-compose query is stopped
docker stop query

# Or check what's using port 7010
lsof -i :7010
```

### Can't connect to other services?
Make sure docker-compose services are running:
```bash
docker compose ps
```

### Code changes not reflecting?
```bash
make rebuild
```

## 📚 API Documentation

Once running, visit:
- Swagger UI: http://localhost:7010/query/docs
- ReDoc: http://localhost:7010/query/redoc

## 🤝 Contributing

1. Follow the workflow above
2. Make your changes in `query/query/*`
3. Test with `make rebuild`
4. Commit your code

No need to install Python, Poetry, or any dependencies locally!

