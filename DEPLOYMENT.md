# Upkeep - Deployment Guide

This guide will help you deploy Upkeep to your Proxmox VM for production use.

## Prerequisites

- Proxmox server running
- Basic Linux knowledge
- Network access to your Proxmox server

## Part 1: Create Proxmox VM

### Recommended VM Specifications

- **OS**: Ubuntu 22.04 LTS Server or Debian 12
- **RAM**: 2-4 GB
- **CPU**: 1-2 cores
- **Storage**: 20 GB
- **Network**: Bridged to your home LAN

### VM Setup Steps

1. **Download Ubuntu Server ISO**
   - Get it from: https://ubuntu.com/download/server
   - Or use Debian 12 from: https://www.debian.org/download

2. **Create VM in Proxmox**
   ```
   - Click "Create VM" in Proxmox web interface
   - General: Name it "upkeep" or similar
   - OS: Select the ISO you downloaded
   - System: Default settings (UEFI optional)
   - Disks: 20GB is plenty
   - CPU: 1-2 cores
   - Memory: 2048-4096 MB
   - Network: Bridge to vmbr0 (or your LAN bridge)
   ```

3. **Install Operating System**
   - Start the VM and follow Ubuntu/Debian installation
   - Choose "Ubuntu Server" (not Desktop)
   - Set a strong password
   - Enable OpenSSH server when prompted
   - Don't install any additional packages yet

4. **Get VM IP Address**
   ```bash
   # After OS installation, login to VM console and run:
   ip addr show
   # Note the IP address (e.g., 192.168.1.100)
   ```

5. **SSH into your VM** (from your computer)
   ```bash
   ssh your-username@192.168.1.100
   ```

## Part 2: Install Docker

Run these commands on your VM:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release git

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group (no sudo needed)
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
exit
```

SSH back in and verify Docker is working:

```bash
docker --version
docker compose version
```

## Part 3: Deploy the Application

### Clone the Repository

```bash
# Clone from GitHub
cd ~
git clone https://github.com/buffamatthew/upkeep.git
cd upkeep
```

### Run Initial Deployment

```bash
# Make the deployment script executable (if not already)
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will:
1. ✅ Check Docker installation
2. ✅ Offer to backup database (skip on first run)
3. ✅ Pull latest code
4. ✅ Build Docker containers
5. ✅ Start the application

### Access Your Application

The script will show you the URL, typically:
```
http://192.168.1.100:3000
```

Replace `192.168.1.100` with your VM's IP address.

## Part 4: Regular Usage

### Updating the Application

When you want to update to the latest version:

```bash
cd ~/upkeep
./deploy.sh
```

This will:
- Backup your database
- Pull latest changes from GitHub
- Rebuild containers
- Restart the application

### Viewing Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View backend logs only
docker-compose -f docker-compose.prod.yml logs -f backend

# View frontend logs only
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Stopping the Application

```bash
cd ~/upkeep
docker-compose -f docker-compose.prod.yml down
```

### Starting the Application

```bash
cd ~/upkeep
docker-compose -f docker-compose.prod.yml up -d
```

### Checking Status

```bash
docker-compose -f docker-compose.prod.yml ps
```

## Part 5: Backup & Restore

### Manual Database Backup

```bash
# Create backups directory
mkdir -p ~/upkeep/backups

# Backup database
docker run --rm \
  -v upkeep_db-data:/data \
  -v ~/upkeep/backups:/backup \
  alpine \
  cp /data/upkeep.db /backup/upkeep_$(date +%Y%m%d_%H%M%S).db
```

### Using the Web Interface

The easiest way to backup:
1. Go to Settings in the web interface
2. Click "Export Backup"
3. Save the JSON file somewhere safe

To restore:
1. Go to Settings
2. Click "Select Backup File"
3. Choose your backup JSON file
4. Select import mode and confirm

## Part 6: Accessing from Outside Your Home

Since you VPN into your home network, no special configuration needed!

Just:
1. Connect to your home VPN
2. Navigate to `http://192.168.1.100:3000` (or your VM's IP)

## Troubleshooting

### Containers won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Try rebuilding
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### Can't access from browser

```bash
# Check if containers are running
docker-compose -f docker-compose.prod.yml ps

# Check if port 3000 is listening
sudo netstat -tulpn | grep 3000

# Check firewall (Ubuntu)
sudo ufw status
sudo ufw allow 3000/tcp  # If needed
```

### Database issues

```bash
# Check database volume
docker volume ls | grep upkeep

# Inspect volume
docker volume inspect upkeep_db-data
```

### Out of disk space

```bash
# Clean up old Docker images
docker system prune -a

# Check disk usage
df -h
```

## Advanced: Automatic Startup on Reboot

To make the app start automatically when VM reboots:

```bash
# Create systemd service
sudo nano /etc/systemd/system/upkeep.service
```

Paste this content:

```ini
[Unit]
Description=Upkeep
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/YOUR_USERNAME/upkeep
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
User=YOUR_USERNAME

[Install]
WantedBy=multi-user.target
```

Replace `YOUR_USERNAME` with your actual username, then:

```bash
# Enable and start the service
sudo systemctl enable upkeep.service
sudo systemctl start upkeep.service

# Check status
sudo systemctl status upkeep.service
```

## Security Notes

Since this is for local/VPN use only:
- ✅ No need for HTTPS (already on your private network)
- ✅ No need for public firewall rules
- ✅ No need for domain name
- ✅ Just keep your VM updated: `sudo apt update && sudo apt upgrade`

## Performance Tuning

The default settings should work great, but if needed:

```bash
# View resource usage
docker stats

# Increase VM RAM in Proxmox if containers are slow
# 4GB is recommended for smooth operation
```

## Getting Help

If you run into issues:
1. Check the logs: `docker-compose -f docker-compose.prod.yml logs`
2. Check container status: `docker-compose -f docker-compose.prod.yml ps`
3. Review this guide
4. Check GitHub issues

## Quick Reference

| Task | Command |
|------|---------|
| Deploy/Update | `./deploy.sh` |
| View logs | `docker-compose -f docker-compose.prod.yml logs -f` |
| Stop app | `docker-compose -f docker-compose.prod.yml down` |
| Start app | `docker-compose -f docker-compose.prod.yml up -d` |
| Restart app | `docker-compose -f docker-compose.prod.yml restart` |
| Check status | `docker-compose -f docker-compose.prod.yml ps` |
| Backup DB | Use Settings page in web interface |

---

**You're all set!** Enjoy your self-hosted Upkeep instance!
