# Database Backup & Recovery Guide

## ⚠️ CRITICAL: What NOT To Do

```bash
# ❌ NEVER run this command - it deletes all your data
docker-compose down -v

# ✅ Always use this instead
docker-compose down
docker-compose restart
```

## Daily Workflow

### Create a Backup (Before ANY Changes)

```bash
# Windows (Git Bash)
bash backup-db.sh

# Linux/Mac
./backup-db.sh
```

**When to backup:**
- Before deploying new code
- Before database schema changes
- Before running migrations
- Daily (automate this!)
- Before running `docker-compose down`

### Restore from Backup

```bash
# List available backups
ls -lh backups/postgres/

# Restore specific backup
bash restore-db.sh backups/postgres/backup_20260220_143000.sql.gz
```

## Production Setup

### 1. Automated Daily Backups

**Linux/Mac (crontab):**
```bash
# Edit crontab
crontab -e

# Add this line (runs at 2 AM daily)
0 2 * * * cd /path/to/Weigh8-Mindrift-Latest && ./backup-db.sh >> logs/backup.log 2>&1
```

**Windows (Task Scheduler):**
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at 2:00 AM
4. Action: Start a program
   - Program: `C:\Program Files\Git\bin\bash.exe`
   - Arguments: `C:\Users\rahul\Desktop\PCG\Weigh8-Mindrift-Latest\backup-db.sh`

### 2. Backup Verification

Test your backups monthly:

```bash
# Create test database
docker exec routewise-postgres psql -U postgres -c "CREATE DATABASE test_restore;"

# Restore to test database
gunzip -c backups/postgres/backup_20260220.sql.gz | \
  docker exec -i routewise-postgres psql -U postgres -d test_restore

# Verify data
docker exec routewise-postgres psql -U postgres -d test_restore -c "\dt"
docker exec routewise-postgres psql -U postgres -d test_restore -c "SELECT COUNT(*) FROM users;"

# Clean up
docker exec routewise-postgres psql -U postgres -c "DROP DATABASE test_restore;"
```

### 3. Off-Site Backups

Copy backups to another location:

```bash
# To AWS S3 (requires AWS CLI)
aws s3 sync backups/postgres/ s3://your-bucket/weigh8-backups/

# To another server (requires SSH key)
rsync -avz backups/postgres/ user@backup-server:/backups/weigh8/

# To cloud storage (Google Drive, Dropbox, etc.)
# Use their sync clients pointing to backups/postgres/
```

## Emergency Recovery

### Scenario: Database Container Lost

```bash
# 1. Stop everything
docker-compose down

# 2. Check available backups
ls -lh backups/postgres/

# 3. Start only database
docker-compose up -d postgres

# 4. Wait for it to be ready
sleep 10

# 5. Restore latest backup
bash restore-db.sh backups/postgres/backup_LATEST.sql.gz

# 6. Verify data is back
docker exec routewise-postgres psql -U postgres -d routewise_db -c "SELECT COUNT(*) FROM users;"

# 7. Start other services
docker-compose up -d
```

### Scenario: Volume Deleted (like today)

If you ran `docker-compose down -v` and deleted volumes:

```bash
# 1. Stop all containers
docker-compose down

# 2. Recreate volumes
docker-compose up -d postgres
sleep 10

# 3. Restore from backup
bash restore-db.sh backups/postgres/backup_LATEST.sql.gz

# 4. Restart everything
docker-compose up -d
```

## Best Practices

### ✅ DO:
- Run `backup-db.sh` before ANY deployment
- Keep backups for at least 30 days
- Test restores monthly
- Store backups off-site
- Use `docker-compose down` (no -v flag)
- Document your recovery process

### ❌ DON'T:
- Run `docker-compose down -v` (deletes data!)
- Skip backups "just this once"
- Trust that "nothing will go wrong"
- Keep backups only on the same machine
- Forget to test your restore process

## Backup Schedule

| Frequency | What | Why |
|---|---|---|
| Before every deployment | Manual backup | Safety net for changes |
| Daily at 2 AM | Automated backup | Regular point-in-time recovery |
| Weekly | Off-site sync | Protection against hardware failure |
| Monthly | Restore test | Verify backups actually work |

## Storage Requirements

- Each backup: ~1-50 MB (depending on data)
- 30 days of backups: ~500 MB - 1.5 GB
- Recommendation: Keep at least 10 GB free for backups

## Monitoring

Check backup health:

```bash
# List last 10 backups with sizes
ls -lht backups/postgres/backup_*.sql.gz | head -10

# Check if today's backup exists
ls -lh backups/postgres/backup_$(date +%Y%m%d)*.sql.gz

# Total backup size
du -sh backups/postgres/
```

## Contact

If you lose data and can't recover:
1. Don't panic
2. Don't make any more changes
3. Check this guide
4. List all available backups
5. Test restore in a separate database first

**Remember: Backups are useless if you don't test them!**
