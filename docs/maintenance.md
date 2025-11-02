# Maintenance Guide

Complete guide for maintaining and monitoring the Thesis Repository System in production.

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Database Maintenance](#database-maintenance)
3. [Log Management](#log-management)
4. [Monitoring](#monitoring)
5. [Security Updates](#security-updates)
6. [Performance Optimization](#performance-optimization)
7. [Troubleshooting](#troubleshooting)
8. [Disaster Recovery](#disaster-recovery)

---

## Backup Strategy

### What to Backup

1. **Database** (Critical)
   - All thesis metadata
   - User accounts
   - Statistics

2. **Uploaded Files** (Critical)
   - PDF thesis files
   - File checksums

3. **Application Code** (Important)
   - Custom modifications
   - Configuration files

4. **Logs** (Optional)
   - Historical logs for analysis

### Database Backup

#### Automated Daily Backups

Create backup script `/home/deployer/backup-db.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/var/backups/thesis-repo"
DB_NAME="thesis_repo_db"
DB_USER="thesis_user"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U $DB_USER -d $DB_NAME -F c -f "$BACKUP_DIR/db_$DATE.dump"

# Compress backup
gzip "$BACKUP_DIR/db_$DATE.dump"

# Delete old backups
find $BACKUP_DIR -name "db_*.dump.gz" -mtime +$RETENTION_DAYS -delete

# Log completion
echo "Backup completed: $DATE" >> $BACKUP_DIR/backup.log
```

Make executable:
```bash
chmod +x /home/deployer/backup-db.sh
```

Create cron job:
```bash
crontab -e
```

Add:
```
0 2 * * * /home/deployer/backup-db.sh
```

This runs daily at 2 AM.

#### Manual Backup

Full backup:
```bash
pg_dump -U postgres -d thesis_repo_db -F c -f backup_$(date +%Y%m%d).dump
```

Schema only:
```bash
pg_dump -U postgres -d thesis_repo_db -s -f schema_$(date +%Y%m%d).sql
```

Data only:
```bash
pg_dump -U postgres -d thesis_repo_db -a -f data_$(date +%Y%m%d).sql
```

#### Restore Database

```bash
# Full restore
pg_restore -U postgres -d thesis_repo_db -c backup_20251102.dump

# If database doesn't exist
createdb -U postgres thesis_repo_db
pg_restore -U postgres -d thesis_repo_db backup_20251102.dump
```

### File Backup

#### Automated File Backups

Create backup script `/home/deployer/backup-files.sh`:

```bash
#!/bin/bash

# Configuration
SOURCE_DIR="/home/deployer/thesis-repo-claude/uploads"
BACKUP_DIR="/var/backups/thesis-repo/files"
DATE=$(date +%Y%m%d)
RETENTION_DAYS=90

# Create backup directory
mkdir -p $BACKUP_DIR

# Rsync backup (incremental)
rsync -av --delete $SOURCE_DIR/ $BACKUP_DIR/latest/

# Create snapshot
cp -al $BACKUP_DIR/latest $BACKUP_DIR/$DATE

# Delete old snapshots
find $BACKUP_DIR -maxdepth 1 -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} \;

# Log completion
echo "File backup completed: $DATE" >> $BACKUP_DIR/backup.log
```

Cron job:
```
0 3 * * * /home/deployer/backup-files.sh
```

#### Off-Site Backup

**AWS S3**:
```bash
# Install AWS CLI
sudo apt install awscli

# Configure
aws configure

# Sync to S3
aws s3 sync /var/backups/thesis-repo s3://your-bucket/thesis-backups/
```

**rsync to remote server**:
```bash
rsync -avz /var/backups/thesis-repo/ user@backup-server:/backups/thesis-repo/
```

### Backup Verification

Test backups monthly:

```bash
#!/bin/bash
# test-backup.sh

# Create test database
createdb -U postgres thesis_test

# Restore latest backup
LATEST_BACKUP=$(ls -t /var/backups/thesis-repo/db_*.dump.gz | head -1)
gunzip -c $LATEST_BACKUP | pg_restore -U postgres -d thesis_test

# Verify record counts
psql -U postgres -d thesis_test -c "SELECT COUNT(*) FROM theses;"
psql -U postgres -d thesis_test -c "SELECT COUNT(*) FROM users;"

# Cleanup
dropdb -U postgres thesis_test
```

---

## Database Maintenance

### Regular Maintenance Tasks

#### Daily (Automated)

```sql
-- Vacuum (remove dead rows)
VACUUM ANALYZE;
```

Create cron:
```
0 4 * * * psql -U postgres -d thesis_repo_db -c "VACUUM ANALYZE;"
```

#### Weekly

```sql
-- Reindex tables
REINDEX DATABASE thesis_repo_db;
```

#### Monthly

```sql
-- Full vacuum (reclaim storage)
VACUUM FULL;

-- Update table statistics
ANALYZE;
```

### Monitoring Database Size

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('thesis_repo_db'));

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Index sizes
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC
LIMIT 10;
```

### Cleaning Old Data

#### Clean Old Sessions

```sql
-- Delete expired sessions
DELETE FROM session WHERE "expiresAt" < NOW();
```

Automate with cron:
```
0 5 * * * psql -U postgres -d thesis_repo_db -c "DELETE FROM session WHERE \"expiresAt\" < NOW();"
```

#### Archive Old Statistics

For databases with millions of statistics logs:

```sql
-- Create archive table
CREATE TABLE statistics_logs_archive (LIKE statistics_logs INCLUDING ALL);

-- Move old data (older than 2 years)
INSERT INTO statistics_logs_archive
SELECT * FROM statistics_logs
WHERE "createdAt" < NOW() - INTERVAL '2 years';

-- Delete from main table
DELETE FROM statistics_logs
WHERE "createdAt" < NOW() - INTERVAL '2 years';

-- Vacuum to reclaim space
VACUUM FULL statistics_logs;
```

---

## Log Management

### Application Logs

Logs are stored in `logs/` directory:

- **error.log**: Errors only
- **combined.log**: All logs
- **application.log**: Application-specific logs

### Log Rotation

Winston automatically rotates logs (configured in `src/config/logger.js`):
- Max size: 5MB
- Max files: 5

Manual configuration with logrotate:

Create `/etc/logrotate.d/thesis-repo`:

```
/home/deployer/thesis-repo-claude/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    missingok
    copytruncate
}
```

Test:
```bash
sudo logrotate -f /etc/logrotate.d/thesis-repo
```

### Viewing Logs

```bash
# Last 100 lines
tail -n 100 logs/error.log

# Follow logs in real-time
tail -f logs/combined.log

# Search logs
grep "ERROR" logs/combined.log

# Search with context
grep -C 5 "ERROR" logs/combined.log
```

### Centralized Logging (Optional)

For production, consider centralized logging:

**ELK Stack** (Elasticsearch, Logstash, Kibana):
```bash
# Install Filebeat
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.x.deb
sudo dpkg -i filebeat-8.x.deb

# Configure filebeat.yml
sudo nano /etc/filebeat/filebeat.yml

# Start Filebeat
sudo systemctl start filebeat
```

**Cloud Services**:
- Loggly
- Papertrail
- DataDog
- AWS CloudWatch

---

## Monitoring

### Uptime Monitoring

**Free Services**:
- UptimeRobot (50 monitors free)
- Pingdom (1 monitor free)
- StatusCake

**Setup**:
1. Create account
2. Add monitor:
   - URL: `https://your-domain.com`
   - Interval: 5 minutes
   - Alert: Email/SMS when down

### Server Monitoring

#### Install Monitoring Tools

```bash
# htop (CPU/Memory)
sudo apt install htop

# iotop (Disk I/O)
sudo apt install iotop

# nethogs (Network)
sudo apt install nethogs
```

#### Check Resources

```bash
# CPU and Memory
htop

# Disk usage
df -h

# Disk I/O
sudo iotop

# Network usage
sudo nethogs

# PM2 process monitor
pm2 monit
```

#### Automated Monitoring with Netdata

```bash
# Install Netdata
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Access dashboard
http://your-server-ip:19999
```

#### Application Monitoring

**PM2 Plus** (Free monitoring):
```bash
pm2 link <secret_key> <public_key>
pm2 install pm2-logrotate
```

Access dashboard at: https://app.pm2.io

### Database Monitoring

#### Active Connections

```sql
SELECT count(*) FROM pg_stat_activity;
```

#### Slow Queries

Enable slow query logging in PostgreSQL:

```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Add:
```
log_min_duration_statement = 1000  # Log queries taking > 1 second
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

View slow queries:
```bash
sudo tail -f /var/log/postgresql/postgresql-15-main.log | grep "duration:"
```

#### Query Performance

```sql
-- Most time-consuming queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

Install pg_stat_statements extension:
```sql
CREATE EXTENSION pg_stat_statements;
```

### Alerts

#### Email Alerts for Critical Errors

Create monitoring script `/home/deployer/check-errors.sh`:

```bash
#!/bin/bash

LOG_FILE="/home/deployer/thesis-repo-claude/logs/error.log"
ALERT_EMAIL="admin@university.edu"

# Count errors in last hour
ERROR_COUNT=$(grep -c "ERROR" $LOG_FILE | tail -60)

if [ $ERROR_COUNT -gt 10 ]; then
    echo "High error rate: $ERROR_COUNT errors in last hour" | \
    mail -s "Thesis Repo Alert: High Error Rate" $ALERT_EMAIL
fi
```

Cron (every hour):
```
0 * * * * /home/deployer/check-errors.sh
```

---

## Security Updates

### System Updates

#### Ubuntu

```bash
# Update package lists
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Upgrade distribution (major version)
sudo apt dist-upgrade -y

# Remove unused packages
sudo apt autoremove -y
```

Automate with cron (weekly):
```
0 3 * * 0 apt update && apt upgrade -y && apt autoremove -y
```

Or enable unattended upgrades:
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Node.js Updates

```bash
# Check current version
node -v

# Update to latest LTS
nvm install --lts
nvm use --lts

# Or with apt
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt update && sudo apt install nodejs
```

### Dependency Updates

#### Check for Updates

```bash
# Check outdated packages
npm outdated

# Check security vulnerabilities
npm audit
```

#### Update Dependencies

```bash
# Update all packages (minor/patch versions)
npm update

# Update to latest (including major)
npm install <package>@latest

# Fix security vulnerabilities
npm audit fix

# Force fix (may break things)
npm audit fix --force
```

#### Update Workflow

1. **Development**:
   ```bash
   git checkout -b update-dependencies
   npm update
   npm audit fix
   ```

2. **Test**: Run full test suite

3. **Deploy**:
   ```bash
   git add package*.json
   git commit -m "chore: update dependencies"
   git push
   ```

4. **Production**:
   ```bash
   git pull
   npm install
   pm2 restart thesis-repo
   ```

### Prisma Updates

```bash
# Update Prisma
npm install prisma@latest @prisma/client@latest

# Regenerate client
npx prisma generate

# Check migrations
npx prisma migrate diff

# Deploy migrations (if any)
npx prisma migrate deploy
```

### SSL Certificate Renewal

Let's Encrypt certificates auto-renew, but verify:

```bash
# Check expiration
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

Cron job (monthly check):
```
0 0 1 * * certbot renew --quiet
```

---

## Performance Optimization

### Database Optimization

#### Add Indexes

Monitor slow queries and add indexes:

```sql
-- Example: Index on thesis title for search
CREATE INDEX idx_theses_title_trgm ON theses USING gin(title gin_trgm_ops);

-- Index on creation date
CREATE INDEX idx_theses_created ON theses(createdAt DESC);
```

#### Connection Pooling

Configure Prisma connection pool in `.env`:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20"
```

#### Query Optimization

Use `EXPLAIN ANALYZE` to optimize queries:

```sql
EXPLAIN ANALYZE
SELECT * FROM theses WHERE status = 'APPROVED';
```

### Application Optimization

#### Enable Compression

In Nginx:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
```

#### Cache Static Assets

In Nginx:

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### PM2 Cluster Mode

Run multiple instances:

```bash
pm2 start server.js -i max --name thesis-repo
```

This uses all CPU cores.

### Node.js Memory Optimization

Increase memory limit if needed:

```bash
pm2 start server.js --node-args="--max-old-space-size=4096" --name thesis-repo
```

Or in `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'thesis-repo',
    script: 'server.js',
    node_args: '--max-old-space-size=4096'
  }]
};
```

---

## Troubleshooting

### Common Issues

#### High Memory Usage

**Diagnosis**:
```bash
# Check memory
free -h

# Find process using most memory
ps aux --sort=-%mem | head -10
```

**Solutions**:
- Restart application: `pm2 restart thesis-repo`
- Increase server RAM
- Optimize queries
- Enable Node.js memory limit

#### High CPU Usage

**Diagnosis**:
```bash
# Check CPU
top

# PM2 monitoring
pm2 monit
```

**Solutions**:
- Check for infinite loops in code
- Optimize database queries
- Add database indexes
- Use PM2 cluster mode

#### Disk Space Full

**Diagnosis**:
```bash
df -h
du -sh /* | sort -h
```

**Solutions**:
- Delete old logs: `sudo rm /var/log/*.log.*.gz`
- Delete old backups
- Increase disk size
- Implement log rotation

#### Database Connection Pool Exhausted

**Error**: `Can't reach database`

**Solutions**:
- Increase connection limit in `DATABASE_URL`
- Check for connection leaks
- Restart application
- Restart PostgreSQL

#### Application Not Responding

**Check**:
```bash
# Is process running?
pm2 list

# Check logs
pm2 logs thesis-repo --lines 100

# Check error logs
tail -100 logs/error.log
```

**Solutions**:
- Restart: `pm2 restart thesis-repo`
- Check firewall: `sudo ufw status`
- Check Nginx: `sudo nginx -t && sudo systemctl status nginx`
- Check disk space
- Check memory

### Emergency Recovery

#### Application Crash

```bash
# Restart with PM2
pm2 restart thesis-repo

# If that fails, stop and start
pm2 stop thesis-repo
pm2 start server.js --name thesis-repo

# Check logs
pm2 logs thesis-repo
```

#### Database Corruption

```bash
# Reindex
psql -U postgres -d thesis_repo_db -c "REINDEX DATABASE thesis_repo_db;"

# Check integrity
psql -U postgres -d thesis_repo_db -c "SELECT * FROM pg_stat_database WHERE datname = 'thesis_repo_db';"

# Restore from backup if severe
```

#### Complete Server Failure

See [Disaster Recovery](#disaster-recovery) below.

---

## Disaster Recovery

### Recovery Plan

1. **Provision New Server** (same specs as original)

2. **Install Dependencies**:
   ```bash
   # Node.js, PostgreSQL, Nginx
   # See deployment guide
   ```

3. **Restore Database**:
   ```bash
   # Create database
   createdb -U postgres thesis_repo_db

   # Restore latest backup
   pg_restore -U postgres -d thesis_repo_db /path/to/backup.dump
   ```

4. **Restore Files**:
   ```bash
   # Rsync from backup
   rsync -av /path/to/backup/uploads/ /home/deployer/thesis-repo-claude/uploads/
   ```

5. **Deploy Application**:
   ```bash
   # Clone repo
   git clone <repo_url>
   cd thesis-repo-claude

   # Install dependencies
   npm install

   # Configure environment
   cp .env.example .env
   nano .env  # Edit with production values

   # Generate Prisma client
   npx prisma generate

   # Start with PM2
   pm2 start server.js --name thesis-repo
   pm2 save
   ```

6. **Configure Nginx and SSL**:
   ```bash
   # Follow deployment guide
   ```

7. **Verify**:
   - Test homepage
   - Test login
   - Test file download
   - Verify data integrity

### Recovery Time Objective (RTO)

Target: **2-4 hours** from disaster to restored service

### Recovery Point Objective (RPO)

Target: **24 hours** (daily backups)

For critical deployments, consider:
- Hourly database backups
- Real-time file replication
- Hot standby server

---

## Maintenance Checklist

### Daily
- [ ] Monitor uptime (automatic)
- [ ] Check error logs for critical issues
- [ ] Verify automated backups ran

### Weekly
- [ ] Review error logs
- [ ] Check disk space
- [ ] Review database performance
- [ ] Check security alerts

### Monthly
- [ ] Test backup restoration
- [ ] Update dependencies (npm update)
- [ ] Review slow queries
- [ ] Check SSL certificate expiration
- [ ] Review user accounts (deactivate old)
- [ ] Database vacuum full

### Quarterly
- [ ] Security audit
- [ ] Performance review
- [ ] Capacity planning
- [ ] Update documentation
- [ ] Review monitoring thresholds

### Yearly
- [ ] Major dependency updates
- [ ] OS upgrade (if available)
- [ ] Disaster recovery test
- [ ] Archive old data
- [ ] Review and update procedures

---

## Support Contacts

### Internal
- **System Administrator**: admin@university.edu
- **Database Administrator**: dba@university.edu
- **Security Team**: security@university.edu

### External
- **Hosting Provider**: support@provider.com
- **Domain Registrar**: support@domain.com
- **SSL Certificate**: support@letsencrypt.org

### Emergency Contacts
- On-call administrator: +1-XXX-XXX-XXXX
- Backup administrator: +1-XXX-XXX-XXXX

---

**Last Updated**: November 2025
**Version**: 1.0.0
**Review Schedule**: Quarterly
