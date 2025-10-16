# TeamLight Deployment Guide

## 🐳 Docker Deployment

### Prerequisites
- Docker and Docker Compose installed on your VM
- Git (to clone the repository)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd openinsight-hub
   ```

2. **Deploy with Docker Compose:**
   ```bash
   # For development
   docker-compose up -d
   
   # For production
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Access the application:**
   - Open your browser to `http://your-vm-ip:3001`
   - Login with default credentials:
     - Admin: `admin` / `Admin124$`
     - User: `user` / `user`

### 🔧 Configuration

#### Environment Variables

Create a `.env` file in the project root to customize settings:

```env
# Server Configuration
NODE_ENV=production
PORT=3001

# Authentication Credentials (CHANGE THESE!)
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_admin_password
USER_USERNAME=your_user_username
USER_PASSWORD=your_secure_user_password

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your_very_secure_jwt_secret_key_here
```

#### Production Deployment

For production deployment, use the production compose file:

```bash
# Set environment variables
export ADMIN_USERNAME="your_admin"
export ADMIN_PASSWORD="your_secure_password"
export USER_USERNAME="your_user"
export USER_PASSWORD="your_secure_password"
export JWT_SECRET="your_very_secure_jwt_secret"

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### 📋 Available Commands

```bash
# Build and run locally
npm run docker:build
npm run docker:run

# Docker Compose commands
npm run docker:compose:up      # Start services
npm run docker:compose:down    # Stop services
npm run docker:compose:logs     # View logs

# Or use docker-compose directly
docker-compose up -d           # Start in background
docker-compose down            # Stop services
docker-compose logs -f         # Follow logs
docker-compose restart         # Restart services
```

### 🔍 Health Checks

The application includes health checks:
- Health endpoint: `http://localhost:3001/api/health`
- Docker health check runs every 30 seconds

### 🛠️ Troubleshooting

#### View Logs
```bash
docker-compose logs -f teamlight-app
```

#### Restart Services
```bash
docker-compose restart teamlight-app
```

#### Rebuild and Deploy
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Check Container Status
```bash
docker-compose ps
```

### 🔒 Security Notes

1. **Change default credentials** before production deployment
2. **Use strong passwords** for admin and user accounts
3. **Set a secure JWT secret** (at least 32 characters)
4. **Consider using HTTPS** in production (use a reverse proxy like nginx)
5. **Regularly update** the application and dependencies

### 🌐 Reverse Proxy Setup (Optional)

For production, consider using nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 📊 Monitoring

Monitor your deployment:
- Check container health: `docker-compose ps`
- View resource usage: `docker stats`
- Monitor logs: `docker-compose logs -f`

### 🔄 Updates

To update the application:
1. Pull latest changes: `git pull`
2. Rebuild and restart: `docker-compose down && docker-compose up -d --build`
