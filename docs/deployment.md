# Deployment Guide

Comprehensive deployment guide for the Thesis Repository System across various platforms.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Railway Deployment](#railway-deployment)
4. [Render Deployment](#render-deployment)
5. [Heroku Deployment](#heroku-deployment)
6. [VPS Deployment (DigitalOcean/Linode)](#vps-deployment)
7. [AWS Deployment](#aws-deployment)
8. [Google Cloud Platform (GCP)](#google-cloud-platform)
9. [Docker Deployment](#docker-deployment)
10. [Domain and SSL Setup](#domain-and-ssl-setup)
11. [Post-Deployment Steps](#post-deployment-steps)
12. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

### Code Preparation
- [ ] All features tested locally
- [ ] Code formatted with Prettier: `npm run format`
- [ ] No sensitive data in code
- [ ] `.env` file not committed to repository
- [ ] `.gitignore` properly configured
- [ ] Database migrations tested
- [ ] Seed data ready (if needed)

### Security
- [ ] Strong `SESSION_SECRET` generated (32+ characters)
- [ ] Strong `STATS_SALT` and `HASH_SALT` generated
- [ ] Changed default admin password
- [ ] HTTPS/SSL certificate ready
- [ ] Security headers configured (Helmet)
- [ ] Rate limiting enabled
- [ ] Input validation tested

### Database
- [ ] PostgreSQL database created
- [ ] Database user created with appropriate permissions
- [ ] Connection string tested
- [ ] Backup strategy planned
- [ ] Migration scripts ready

### Files & Storage
- [ ] Upload directory strategy decided
- [ ] File size limits configured
- [ ] Storage quota planned
- [ ] CDN considered for file delivery (optional)

### Performance
- [ ] Node.js version >= 18
- [ ] Connection pooling configured
- [ ] Caching strategy planned (optional)
- [ ] Static assets optimization

### Monitoring
- [ ] Error logging configured (Winston)
- [ ] Application monitoring planned
- [ ] Uptime monitoring setup
- [ ] Backup monitoring

---

## Environment Configuration

### Production Environment Variables

Create a production `.env` file with these variables:

```env
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# Security & Session
SESSION_SECRET=<GENERATE_STRONG_32+_CHAR_SECRET>
SESSION_MAX_AGE=7200000
STATS_SALT=<GENERATE_STRONG_32+_CHAR_SECRET>
HASH_SALT=<GENERATE_STRONG_32+_CHAR_SECRET>

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
LOGIN_RATE_LIMIT_MAX=5
DOWNLOAD_RATE_LIMIT_MAX=20

# Logging
LOG_LEVEL=info
LOG_DIR=logs
```

### Generating Secrets

Use Node.js crypto:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this command 3 times for:
1. `SESSION_SECRET`
2. `STATS_SALT`
3. `HASH_SALT`

**Example output**:
```
8f7d3e9c1a2b4f6e8d0c9a1b3e5f7d9c1a2b4f6e8d0c9a1b3e5f7d9c1a2b4f6e
```

---

## Railway Deployment

Railway offers easy deployment with automatic HTTPS and database hosting.

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Authorize Railway to access your repositories

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your thesis repository
4. Railway automatically detects Node.js project

### Step 3: Add PostgreSQL Database

1. In your Railway project dashboard
2. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
3. Railway creates database and provides connection string
4. Connection string auto-added to environment variables

### Step 4: Configure Environment Variables

1. Go to project → **"Variables"** tab
2. Add each environment variable:
   ```
   NODE_ENV=production
   SESSION_SECRET=your_secret_here
   STATS_SALT=your_salt_here
   HASH_SALT=your_hash_here
   MAX_FILE_SIZE=10485760
   UPLOAD_DIR=uploads
   RATE_LIMIT_ENABLED=true
   LOG_LEVEL=info
   ```
3. Railway automatically sets `DATABASE_URL`
4. Railway automatically sets `PORT`

### Step 5: Add Build Command

1. Go to **"Settings"** → **"Build"**
2. Set build command:
   ```
   npm install && npx prisma generate && npx prisma migrate deploy
   ```
3. Set start command:
   ```
   npm start
   ```

### Step 6: Deploy

1. Railway automatically deploys on push to main branch
2. Monitor deployment in **"Deployments"** tab
3. View logs for any errors

### Step 7: Run Database Migrations

Using Railway CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migrations
railway run npx prisma migrate deploy

# Seed database (optional)
railway run npm run seed
```

### Step 8: Access Your Application

1. Railway provides a temporary domain: `*.railway.app`
2. Access at: `https://your-project.railway.app`
3. Test functionality

### Step 9: Custom Domain (Optional)

1. Go to **"Settings"** → **"Domains"**
2. Click **"Add Custom Domain"**
3. Enter your domain: `thesis-repo.youruniversity.edu`
4. Add CNAME record in your DNS:
   ```
   CNAME thesis-repo your-project.railway.app
   ```
5. Wait for DNS propagation (5-60 minutes)
6. Railway automatically provisions SSL certificate

### Railway Pricing

- **Hobby Plan**: $5/month (500 hours)
- **Pro Plan**: $20/month + usage
- Database included in plan

---

## Render Deployment

Render offers free tier with PostgreSQL database.

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Authorize Render

### Step 2: Create PostgreSQL Database

1. Dashboard → **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: thesis-repo-db
   - **Database**: thesis_repo_db
   - **User**: thesis_user
   - **Region**: Choose closest to users
   - **Plan**: Free (or paid for production)
3. Click **"Create Database"**
4. Note down:
   - **Internal Database URL** (for app)
   - **External Database URL** (for migrations)

### Step 3: Create Web Service

1. Dashboard → **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: thesis-repo
   - **Environment**: Node
   - **Region**: Same as database
   - **Branch**: main
   - **Build Command**:
     ```
     npm install && npx prisma generate && npx prisma migrate deploy
     ```
   - **Start Command**:
     ```
     npm start
     ```
   - **Plan**: Free (or paid)

### Step 4: Environment Variables

In Web Service settings, add environment variables:

```
NODE_ENV=production
DATABASE_URL=<internal_database_url_from_step_2>
SESSION_SECRET=<generate_strong_secret>
STATS_SALT=<generate_strong_secret>
HASH_SALT=<generate_strong_secret>
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/opt/render/project/src/uploads
RATE_LIMIT_ENABLED=true
LOG_LEVEL=info
APP_URL=https://your-app.onrender.com
```

**Important**: Use **Internal Database URL** for `DATABASE_URL`

### Step 5: Create Persistent Disk (For File Uploads)

1. In Web Service → **"Disks"**
2. Click **"Add Disk"**
3. Configure:
   - **Name**: uploads
   - **Mount Path**: `/opt/render/project/src/uploads`
   - **Size**: 1GB (or more based on needs)
4. Click **"Save"**

### Step 6: Deploy

1. Render auto-deploys on git push
2. Monitor deployment logs
3. Access at: `https://your-app.onrender.com`

### Step 7: Run Seed (Optional)

Using Render Shell:

1. Web Service → **"Shell"** tab
2. Run:
   ```bash
   npm run seed
   ```

### Step 8: Custom Domain

1. Web Service → **"Settings"** → **"Custom Domains"**
2. Add your domain
3. Configure DNS:
   ```
   CNAME thesis-repo your-app.onrender.com
   ```
4. Render auto-provisions SSL

### Render Pricing

- **Free Tier**: Limited resources, spins down after inactivity
- **Starter**: $7/month
- **Standard**: $25/month
- Database Free: 90 days, then $7/month

---

## Heroku Deployment

### Step 1: Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu
curl https://cli-assets.heroku.com/install-ubuntu.sh | sh

# Windows
# Download installer from heroku.com
```

### Step 2: Login to Heroku

```bash
heroku login
```

### Step 3: Create Heroku App

```bash
cd /path/to/thesis-repo-claude
heroku create thesis-repo-app
```

### Step 4: Add PostgreSQL

```bash
heroku addons:create heroku-postgresql:essential-0
```

This automatically sets `DATABASE_URL` environment variable.

### Step 5: Configure Environment Variables

```bash
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
heroku config:set STATS_SALT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
heroku config:set HASH_SALT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
heroku config:set MAX_FILE_SIZE=10485760
heroku config:set UPLOAD_DIR=uploads
heroku config:set RATE_LIMIT_ENABLED=true
heroku config:set LOG_LEVEL=info
```

### Step 6: Create Procfile

Create `Procfile` in project root:

```
web: node server.js
release: npx prisma migrate deploy
```

### Step 7: Deploy

```bash
git add Procfile
git commit -m "Add Procfile for Heroku"
git push heroku main
```

### Step 8: Run Migrations & Seed

```bash
# Migrations run automatically via Procfile release command

# Seed database
heroku run npm run seed
```

### Step 9: View App

```bash
heroku open
```

### Step 10: View Logs

```bash
heroku logs --tail
```

### Heroku File Storage Caveat

⚠️ **Important**: Heroku has **ephemeral filesystem**. Uploaded files are deleted on dyno restart.

**Solutions**:

1. **AWS S3**: Use S3 for file storage
2. **Cloudinary**: Image/document hosting
3. **DigitalOcean Spaces**: S3-compatible storage

Modify upload handler to store files externally.

### Heroku Pricing

- **Free Tier**: Deprecated (no longer available)
- **Eco**: $5/month (1000 dyno hours shared)
- **Basic**: $7/month per dyno
- **Standard**: $25+/month
- PostgreSQL: $9-$50/month

---

## VPS Deployment

Deploy on DigitalOcean, Linode, Vultr, or any VPS provider.

### Step 1: Create VPS

**Recommended Specs**:
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 80GB SSD
- **OS**: Ubuntu 22.04 LTS

**Providers**:
- DigitalOcean: $24/month (Basic Droplet)
- Linode: $24/month (Nanode)
- Vultr: $24/month (Cloud Compute)

### Step 2: Initial Server Setup

SSH into your server:

```bash
ssh root@your_server_ip
```

Create non-root user:

```bash
adduser deployer
usermod -aG sudo deployer
su - deployer
```

### Step 3: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 4: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE thesis_repo_db;
CREATE USER thesis_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE thesis_repo_db TO thesis_user;
\q
```

### Step 5: Clone Repository

```bash
cd /home/deployer
git clone https://github.com/your-username/thesis-repo-claude.git
cd thesis-repo-claude
```

### Step 6: Install Dependencies

```bash
npm install
```

### Step 7: Configure Environment

```bash
cp .env.example .env
nano .env
```

Edit `.env`:

```env
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com
DATABASE_URL=postgresql://thesis_user:secure_password_here@localhost:5432/thesis_repo_db?schema=public
SESSION_SECRET=<generated_secret>
STATS_SALT=<generated_secret>
HASH_SALT=<generated_secret>
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
RATE_LIMIT_ENABLED=true
LOG_LEVEL=info
```

### Step 8: Run Migrations

```bash
npx prisma generate
npx prisma migrate deploy
npm run seed
```

### Step 9: Create Upload Directories

```bash
mkdir -p uploads/thesis
mkdir -p logs
chmod -R 755 uploads
chmod -R 755 logs
```

### Step 10: Start with PM2

```bash
pm2 start server.js --name thesis-repo
pm2 save
pm2 startup
```

Follow the command output to enable PM2 on boot.

### Step 11: Configure Nginx

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/thesis-repo
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        alias /home/deployer/thesis-repo-claude/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/thesis-repo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 12: Install SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

Certbot automatically updates Nginx config for HTTPS.

### Step 13: Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Step 14: Access Application

Visit: `https://your-domain.com`

### Updating Deployment

```bash
cd /home/deployer/thesis-repo-claude
git pull
npm install
npx prisma generate
npx prisma migrate deploy
pm2 restart thesis-repo
```

---

## AWS Deployment

Deploy on Amazon Web Services using EC2 and RDS.

### Architecture

- **EC2**: Application server
- **RDS PostgreSQL**: Database
- **S3**: File storage (uploads)
- **CloudFront**: CDN (optional)
- **Route 53**: DNS

### Step 1: Create RDS PostgreSQL Database

1. AWS Console → **RDS** → **Create database**
2. Configuration:
   - **Engine**: PostgreSQL 15.x
   - **Template**: Production (or Dev/Test)
   - **DB instance class**: db.t3.micro (free tier) or db.t3.small
   - **Storage**: 20GB SSD
   - **DB instance identifier**: thesis-repo-db
   - **Master username**: postgres
   - **Master password**: <strong_password>
   - **VPC**: Default or custom
   - **Public access**: Yes (for setup, restrict later)
   - **VPC security group**: Create new (allow PostgreSQL from EC2)
3. Click **Create database**
4. Note the **Endpoint** (e.g., `thesis-repo-db.xxx.us-east-1.rds.amazonaws.com`)

### Step 2: Create EC2 Instance

1. AWS Console → **EC2** → **Launch Instance**
2. Configuration:
   - **Name**: thesis-repo-server
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance type**: t2.small (or t2.micro for testing)
   - **Key pair**: Create new or use existing
   - **Network**: Same VPC as RDS
   - **Security group**:
     - SSH (22) from your IP
     - HTTP (80) from anywhere
     - HTTPS (443) from anywhere
   - **Storage**: 30GB gp3
3. Click **Launch Instance**
4. Note the **Public IPv4 address**

### Step 3: Connect to EC2

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### Step 4: Install Dependencies

Follow [VPS Deployment Step 3](#step-3-install-dependencies)

### Step 5: Create S3 Bucket for Uploads

1. AWS Console → **S3** → **Create bucket**
2. Configuration:
   - **Bucket name**: thesis-repo-uploads-yourname
   - **Region**: Same as EC2
   - **Block all public access**: Uncheck (configure policies later)
3. Create bucket
4. Configure bucket policy for public read:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::thesis-repo-uploads-yourname/*"
    }
  ]
}
```

### Step 6: Install AWS SDK

On EC2:

```bash
cd /home/ubuntu/thesis-repo-claude
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage multer-s3
```

### Step 7: Configure S3 Upload

Modify `src/config/multer.js` to use S3 instead of local storage.

### Step 8: Set Environment Variables

```bash
nano .env
```

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:password@thesis-repo-db.xxx.us-east-1.rds.amazonaws.com:5432/postgres?schema=public
SESSION_SECRET=<secret>
AWS_S3_BUCKET=thesis-repo-uploads-yourname
AWS_REGION=us-east-1
```

### Step 9: Run Migrations

```bash
npx prisma generate
npx prisma migrate deploy
npm run seed
```

### Step 10: Configure Nginx and SSL

Follow [VPS Deployment Steps 11-12](#step-11-configure-nginx)

### Step 11: Configure Route 53 (Optional)

1. AWS Console → **Route 53** → **Hosted zones**
2. Create hosted zone for your domain
3. Create **A record** pointing to EC2 public IP
4. Update domain nameservers to Route 53 nameservers

### AWS Costs Estimate

- **EC2 t2.small**: ~$17/month
- **RDS db.t3.micro**: ~$15/month (free tier: 750 hours/month)
- **S3**: ~$0.023/GB/month + requests
- **Data transfer**: ~$0.09/GB (first 10TB/month)
- **Route 53**: $0.50/hosted zone/month
- **Total**: ~$35-50/month (varies with usage)

---

## Google Cloud Platform

Deploy on GCP using Cloud Run and Cloud SQL.

### Step 1: Create GCP Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create new project: **thesis-repo**
3. Enable billing

### Step 2: Enable APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
```

### Step 3: Create Cloud SQL Instance

```bash
gcloud sql instances create thesis-repo-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=<strong_password>
```

Create database:

```bash
gcloud sql databases create thesis_repo_db --instance=thesis-repo-db
```

### Step 4: Build Docker Image

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

RUN mkdir -p uploads logs

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

Build and push to GCR:

```bash
gcloud builds submit --tag gcr.io/thesis-repo/thesis-app
```

### Step 5: Deploy to Cloud Run

```bash
gcloud run deploy thesis-repo \
  --image gcr.io/thesis-repo/thesis-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances thesis-repo:us-central1:thesis-repo-db \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=postgresql://postgres:password@/thesis_repo_db?host=/cloudsql/thesis-repo:us-central1:thesis-repo-db,SESSION_SECRET=<secret>"
```

### Step 6: Access Application

GCP provides a URL: `https://thesis-repo-xxxxx.run.app`

### GCP Pricing

- **Cloud Run**: Pay per request (~$0.00024/request)
- **Cloud SQL**: ~$7-10/month (db-f1-micro)
- **Storage**: ~$0.026/GB/month
- **Very cost-effective for low traffic**

---

## Docker Deployment

### Dockerfile

Create comprehensive `Dockerfile`:

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/views ./views
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./

# Create directories
RUN mkdir -p uploads logs

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:postgres@db:5432/thesis_repo_db?schema=public
      SESSION_SECRET: ${SESSION_SECRET}
      STATS_SALT: ${STATS_SALT}
      HASH_SALT: ${HASH_SALT}
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: thesis_repo_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

### Build and Run

```bash
# Build image
docker build -t thesis-repo .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Domain and SSL Setup

### DNS Configuration

Point your domain to your server:

**A Record**:
```
Type: A
Name: @
Value: <your_server_ip>
TTL: 300
```

**CNAME Record** (www):
```
Type: CNAME
Name: www
Value: your-domain.com
TTL: 300
```

### SSL Certificate with Let's Encrypt

Already covered in VPS deployment. For other platforms:

**Nginx**:
```bash
sudo certbot --nginx -d your-domain.com
```

**Apache**:
```bash
sudo certbot --apache -d your-domain.com
```

**Standalone** (no web server):
```bash
sudo certbot certonly --standalone -d your-domain.com
```

---

## Post-Deployment Steps

### 1. Verify Application

- [ ] Homepage loads
- [ ] Login works
- [ ] Admin dashboard accessible
- [ ] Student can submit thesis
- [ ] File upload works
- [ ] Download works
- [ ] Search works
- [ ] Citation export works

### 2. Change Default Credentials

```bash
# Login as admin with default credentials
# Navigate to profile
# Change password immediately
```

### 3. Configure Monitoring

- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure error alerts
- Set up log aggregation

### 4. Set Up Backups

See [maintenance.md](maintenance.md) for backup strategies.

### 5. Performance Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test homepage
ab -n 1000 -c 10 https://your-domain.com/

# Monitor server resources
htop
```

---

## Troubleshooting

### Application Won't Start

**Check logs**:
```bash
# PM2
pm2 logs thesis-repo

# Docker
docker-compose logs app

# Heroku
heroku logs --tail
```

**Common issues**:
- Database connection failed (check `DATABASE_URL`)
- Port already in use (check `PORT` setting)
- Missing environment variables
- Prisma client not generated (`npx prisma generate`)

### Database Connection Errors

**Check connection**:
```bash
psql -h hostname -U username -d database_name
```

**Verify**:
- Correct hostname/IP
- Correct port (default: 5432)
- Correct credentials
- Database exists
- User has permissions
- Firewall allows connection

### File Uploads Failing

**Check**:
- Upload directory exists and is writable
- Disk space available: `df -h`
- `MAX_FILE_SIZE` environment variable set
- Nginx/Apache client_max_body_size configured
- File permissions: `chmod -R 755 uploads`

### SSL Certificate Issues

**Renew certificate**:
```bash
sudo certbot renew
```

**Check certificate status**:
```bash
sudo certbot certificates
```

**Force renewal**:
```bash
sudo certbot renew --force-renewal
```

### Performance Issues

**Check resources**:
```bash
# CPU and Memory
htop

# Disk usage
df -h

# Database connections
# PostgreSQL
SELECT count(*) FROM pg_stat_activity;
```

**Optimize**:
- Add database indexes
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`
- Enable compression in Nginx
- Use CDN for static assets

---

## Conclusion

Choose deployment platform based on:

| Platform | Best For | Difficulty | Cost |
|----------|----------|------------|------|
| **Railway** | Quick start, ease of use | Easy | $5-20/mo |
| **Render** | Free tier, beginners | Easy | Free-$25/mo |
| **Heroku** | Established platform | Easy | $7-50/mo |
| **VPS** | Full control, cost-effective | Medium | $12-50/mo |
| **AWS** | Enterprise, scalability | Hard | $35-100+/mo |
| **GCP** | Pay-per-use, Cloud Run | Medium | $10-50/mo |
| **Docker** | Any platform, portability | Medium | Varies |

For most universities: **VPS (DigitalOcean/Linode)** offers best balance of control, performance, and cost.

---

**Last Updated**: November 2025
**Version**: 1.0.0
