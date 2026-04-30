# Koyeb deployment configuration for Hyvigle
# This file documents the Koyeb setup — actual config is done via Koyeb dashboard or CLI

# Service: hyvigle-app
# Runtime: Node.js 20
# Region: was (Washington DC) or fra (Frankfurt)

# Build command:
#   npm run install:all && npm run build:client

# Run command:
#   npm start

# Environment variables to set in Koyeb dashboard:
#   PORT=4000 (Koyeb auto-sets this)
#   ALLOWED_ORIGINS=https://your-app-name.koyeb.app

# Health check:
#   Path: /api/health
#   Port: 4000

# Scaling:
#   Min instances: 1
#   Max instances: 3 (adjust as needed)

# Ports:
#   4000 (HTTP)
