#!/bin/bash

echo "🔍 Debugging n8n installation for automation.zufto.pl"
echo "=================================================="

# Check running processes
echo "📋 1. Checking running n8n processes:"
ps aux | grep n8n | grep -v grep || echo "No n8n processes found via ps"

# Check Docker containers
echo ""
echo "🐳 2. Checking Docker containers:"
if command -v docker &> /dev/null; then
    docker ps | grep n8n || echo "No n8n Docker containers running"
    echo ""
    echo "All Docker containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
else
    echo "Docker not found"
fi

# Check systemd services
echo ""
echo "⚙️ 3. Checking systemd services:"
systemctl list-units --type=service | grep n8n || echo "No n8n systemd services"

# Check listening ports
echo ""
echo "🌐 4. Checking listening ports (likely 5678, 80, 443):"
netstat -tlnp 2>/dev/null | grep -E ":(5678|80|443|8080)" || echo "netstat not available, trying ss:"
ss -tlnp 2>/dev/null | grep -E ":(5678|80|443|8080)" || echo "No listening ports found"

# Check nginx/apache configs
echo ""
echo "🌍 5. Checking web server configs:"
if [ -d "/etc/nginx" ]; then
    echo "Nginx configs containing 'automation.zufto.pl':"
    grep -r "automation.zufto.pl" /etc/nginx/ 2>/dev/null || echo "No nginx configs found"
fi

if [ -d "/etc/apache2" ]; then
    echo "Apache configs containing 'automation.zufto.pl':"
    grep -r "automation.zufto.pl" /etc/apache2/ 2>/dev/null || echo "No apache configs found"
fi

# Check common n8n installation paths
echo ""
echo "📁 6. Checking common n8n installation paths:"
paths=(
    "/opt/n8n"
    "/usr/local/n8n" 
    "/home/*/n8n"
    "/var/www/n8n"
    "/root/n8n"
    "~/.n8n"
)

for path in "${paths[@]}"; do
    if [ -d "$path" ]; then
        echo "Found: $path"
        ls -la "$path" 2>/dev/null
    fi
done

# Check PM2 processes
echo ""
echo "🔧 7. Checking PM2 processes:"
if command -v pm2 &> /dev/null; then
    pm2 list | grep n8n || echo "No n8n processes in PM2"
else
    echo "PM2 not found"
fi

# Check environment files
echo ""
echo "📝 8. Checking for environment files:"
env_files=(
    "/opt/n8n/.env"
    "/var/www/n8n/.env"
    "/root/.n8n/.env"
    "~/.n8n/.env"
    "/etc/n8n/.env"
)

for env_file in "${env_files[@]}"; do
    if [ -f "$env_file" ]; then
        echo "Found env file: $env_file"
        echo "Content (hiding sensitive data):"
        cat "$env_file" | sed 's/PASSWORD=.*/PASSWORD=***HIDDEN***/' | sed 's/SECRET=.*/SECRET=***HIDDEN***/'
    fi
done

echo ""
echo "🎯 Next steps:"
echo "1. Identify which installation is running (Docker/systemd/PM2)"
echo "2. Find the config file or environment variables"
echo "3. Add API configuration to the correct location"
echo "4. Restart the service" 