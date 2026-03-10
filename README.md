# Upkeep

A Docker-based web application for tracking maintenance on anything — vehicles, appliances, rooms, equipment, and more.

## Quick Start

### Development

```bash
# Start the application
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5001
```

That's it! Open http://localhost:3000 in your browser.

### Production Deployment

For deploying to a server (Proxmox VM, VPS, etc.), see **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete instructions.

Quick deployment:
```bash
./deploy.sh
```

## Features

### Assets
- Track any asset: vehicles, appliances, rooms, equipment, etc.
- Optional custom usage metrics (miles, hours, cycles, etc.)
- Organize with categories and locations

### Maintenance Tracking
- **Time-based** scheduling (e.g., "Replace filter every 3 months")
- **Usage-based** scheduling (e.g., "Oil change every 5000 miles")
- Visual dashboard with progress bars and color-coded status
- Top 3 urgent maintenance items per asset

### Logging
- Log scheduled maintenance with dates, costs, and notes
- Log general maintenance (one-off repairs, upgrades)
- File attachments (up to 5 per log, 16MB each)
- Complete maintenance history with inline editing

### Data Management
- Export/import for data backup (JSON format)
- Automatic usage tracking updates

## Tech Stack

- **Backend:** Python/Flask, SQLAlchemy, SQLite
- **Frontend:** React, Vite, React Router
- **Infrastructure:** Docker & Docker Compose

## Development

### Running Tests

```bash
# Automated unit tests
docker-compose exec backend pytest -v

# Manual API testing
./test_api.sh
```

### Common Commands

```bash
# View logs
docker-compose logs backend --tail 50
docker-compose logs frontend --tail 50

# Restart a service
docker-compose restart frontend

# Stop everything
docker-compose down
```

### Port Conflict on macOS

Port 5000 is used by macOS Control Center (AirPlay). The backend runs on **port 5001** instead.

## Project Structure

```
├── backend/          # Flask API + SQLAlchemy models
├── frontend/         # React application
├── docker-compose.yml
├── PROJECT_STATUS.md # Detailed project status and progress
└── README.md         # This file
```

## API Endpoints

### Assets
- `GET /api/assets` - List all assets
- `POST /api/assets` - Create asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### Maintenance Items
- `GET /api/maintenance-items?asset_id=:id` - List items
- `POST /api/maintenance-items` - Create item

### Maintenance Logs
- `GET /api/maintenance-logs?maintenance_item_id=:id` - List logs
- `POST /api/maintenance-logs` - Create log (with file upload)

### Backup
- `GET /api/backup/export` - Export all data
- `POST /api/backup/import` - Import data from backup

## License

MIT
