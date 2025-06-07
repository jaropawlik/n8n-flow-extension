# n8n API Setup Guide

## 🔍 Step 1: Identify Your Installation

**Run on your server:**
```bash
# Download and run the debug script
curl -O https://your-server/debug-n8n-installation.sh
chmod +x debug-n8n-installation.sh
./debug-n8n-installation.sh
```

Or manually check:
```bash
# Check running processes
ps aux | grep n8n

# Check Docker
docker ps | grep n8n

# Check systemd
systemctl status n8n

# Check PM2
pm2 list
```

---

## 🐳 Option 1: Docker Installation

### If you see n8n in `docker ps`:

**1. Find the docker-compose.yml:**
```bash
find / -name "docker-compose.yml" -exec grep -l "n8n" {} \; 2>/dev/null
```

**2. Edit docker-compose.yml:**
```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    restart: always
    environment:
      - N8N_API_ENABLED=true
      - N8N_CORS_ORIGIN=*
      - N8N_HOST=automation.zufto.pl
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      # Optional security:
      # - N8N_BASIC_AUTH_ACTIVE=true
      # - N8N_BASIC_AUTH_USER=admin
      # - N8N_BASIC_AUTH_PASSWORD=secure_password
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
```

**3. Restart container:**
```bash
cd /path/to/docker-compose/
docker-compose down
docker-compose up -d
```

---

## ⚙️ Option 2: Systemd Service

### If you see n8n in `systemctl status`:

**1. Find the service file:**
```bash
systemctl status n8n
# Look for "Loaded:" path, usually /etc/systemd/system/n8n.service
```

**2. Check environment file:**
```bash
cat /etc/systemd/system/n8n.service
# Look for EnvironmentFile= line
```

**3. Edit environment file (e.g., /etc/n8n/.env):**
```bash
# Add to the environment file:
N8N_API_ENABLED=true
N8N_CORS_ORIGIN=*
N8N_HOST=automation.zufto.pl
N8N_PORT=5678
N8N_PROTOCOL=https
```

**4. Restart service:**
```bash
sudo systemctl daemon-reload
sudo systemctl restart n8n
```

---

## 🔧 Option 3: PM2 Process Manager

### If you see n8n in `pm2 list`:

**1. Check PM2 app config:**
```bash
pm2 show n8n
# Look for the script path and environment variables
```

**2. Stop PM2 process:**
```bash
pm2 stop n8n
```

**3. Add environment variables:**

**Option A: Create/edit ecosystem file:**
```bash
# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'n8n',
    script: 'n8n',
    env: {
      N8N_API_ENABLED: 'true',
      N8N_CORS_ORIGIN: '*',
      N8N_HOST: 'automation.zufto.pl',
      N8N_PORT: '5678',
      N8N_PROTOCOL: 'https'
    }
  }]
}
EOF

pm2 start ecosystem.config.js
```

**Option B: Set environment variables directly:**
```bash
pm2 start n8n --name "n8n" --env N8N_API_ENABLED=true --env N8N_CORS_ORIGIN=* --env N8N_HOST=automation.zufto.pl
```

---

## 📦 Option 4: NPM Global Installation

### If n8n is installed globally:

**1. Create environment file:**
```bash
# Create ~/.n8n/.env
mkdir -p ~/.n8n
cat > ~/.n8n/.env << 'EOF'
N8N_API_ENABLED=true
N8N_CORS_ORIGIN=*
N8N_HOST=automation.zufto.pl
N8N_PORT=5678
N8N_PROTOCOL=https
EOF
```

**2. Restart n8n:**
```bash
# Kill existing process
pkill -f n8n

# Start with environment file
cd ~/.n8n
n8n start
```

---

## 🌐 Reverse Proxy Configuration

### If using Nginx (common with Cloudflare):

**Edit nginx config (usually in /etc/nginx/sites-available/):**
```nginx
server {
    listen 443 ssl;
    server_name automation.zufto.pl;
    
    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API specific configuration
    location /api/ {
        proxy_pass http://localhost:5678/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers for API
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type";
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

**Restart nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ Testing API

After configuration, test the API:

```bash
# Test basic API
curl https://automation.zufto.pl/api/v1/workflows

# Test with authentication (if enabled)
curl -u "username:password" https://automation.zufto.pl/api/v1/workflows

# Check from browser console
fetch('https://automation.zufto.pl/api/v1/workflows')
  .then(r => r.json())
  .then(console.log)
```

---

## 🔧 Troubleshooting

**If API returns 404:**
- Check if N8N_API_ENABLED=true is set
- Restart the n8n service

**If CORS errors in browser:**
- Add N8N_CORS_ORIGIN=* to environment
- Or add specific origin: N8N_CORS_ORIGIN=https://automation.zufto.pl

**If authentication errors:**
- Check if basic auth is enabled
- Verify credentials

**Check logs:**
```bash
# Docker
docker logs container_name

# Systemd
journalctl -u n8n -f

# PM2
pm2 logs n8n
``` 