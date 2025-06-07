# n8n API Integration Setup

## 🔧 n8n API Configuration

### 1. Enable n8n API on your server

Add to your n8n environment variables:
```bash
# Enable API
N8N_API_ENABLED=true

# Optional: Set API port (default uses same as UI)
N8N_PORT=5678
N8N_LISTEN_ADDRESS=0.0.0.0

# Security
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=your_username
N8N_BASIC_AUTH_PASSWORD=your_password
```

### 2. Available API Endpoints

```bash
# Get all workflows
GET https://automation.zufto.pl/api/v1/workflows

# Get specific workflow
GET https://automation.zufto.pl/api/v1/workflows/{id}

# Get workflow executions
GET https://automation.zufto.pl/api/v1/executions

# Get active workflows
GET https://automation.zufto.pl/api/v1/workflows/active
```

### 3. CORS Configuration

For browser access, you may need to configure CORS:
```bash
N8N_CORS_ORIGIN=*
# Or specific domain: N8N_CORS_ORIGIN=https://automation.zufto.pl
```

## 🛡️ Security Options

### Option A: Direct API Access
- Enable n8n API with authentication
- Extension connects directly
- ✅ Simple setup
- ❌ Exposes n8n API to browser

### Option B: Proxy API (Recommended)
- Create middleware API on your server
- Handles authentication & filtering  
- ✅ More secure
- ✅ Can aggregate data
- ❌ More complex setup

## 📡 Extension Integration

Once API is available, the extension can fetch:
- Complete workflow structure
- Node configurations  
- Connection mappings
- Execution history
- Real-time status
- Detailed error information

This will provide 10x better AI assistance! 