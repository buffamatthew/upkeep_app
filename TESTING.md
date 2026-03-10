# Testing Guide

## Overview

There are two ways to test the Upkeep backend:

1. **Automated Unit Tests** - Using pytest
2. **Manual API Testing** - Using the test script

## Prerequisites

Make sure the application is running:
```bash
docker-compose up --build
```

The backend should be accessible at http://localhost:5001

---

## Option 1: Automated Unit Tests (Recommended)

These tests run in isolation using an in-memory database.

### Running the tests

```bash
# Enter the backend container
docker-compose exec backend bash

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_vehicles.py

# Run with coverage report
pytest --cov=app tests/
```

### What's tested

**test_vehicles.py:**
- Creating vehicles
- Getting all vehicles
- Getting vehicle by ID
- Updating vehicle information
- Deleting vehicles
- Error handling (404s)

**test_maintenance_items.py:**
- Creating maintenance items (mileage-based and time-based)
- Getting items by vehicle
- Updating items
- Deleting items
- Linking items to vehicles

**test_maintenance_logs.py:**
- Creating maintenance logs
- Auto-updating vehicle mileage when logging maintenance
- Getting logs by maintenance item
- Deleting logs
- Date handling

---

## Option 2: Manual API Testing Script

This script tests the live API endpoints and creates real data.

### Running the script

```bash
# Make sure the app is running first
docker-compose up -d

# Run the test script
./test_api.sh
```

### What the script does

1. Gets all vehicles (empty initially)
2. Creates a Toyota Camry
3. Retrieves the created vehicle
4. Creates "Oil Change" maintenance item
5. Creates "Tire Rotation" maintenance item
6. Gets all maintenance items for the vehicle
7. Logs an oil change maintenance
8. Verifies vehicle mileage was auto-updated to 30,000
9. Gets maintenance logs
10. Updates vehicle mileage

The script outputs formatted JSON for each step.

### Cleanup

The test data remains in your database. To clean up:

```bash
# The script outputs a cleanup command at the end, or:
curl -X DELETE http://localhost:5001/api/vehicles/1
```

---

## Manual Testing with curl

You can also test individual endpoints:

### Create a vehicle
```bash
curl -X POST http://localhost:5001/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2019,
    "make": "Honda",
    "model": "Civic",
    "engine_type": "1.5L Turbo",
    "current_mileage": 15000
  }' | python3 -m json.tool
```

### Get all vehicles
```bash
curl http://localhost:5001/api/vehicles | python3 -m json.tool
```

### Create a maintenance item
```bash
curl -X POST http://localhost:5001/api/maintenance-items \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": 1,
    "name": "Battery",
    "maintenance_type": "time",
    "frequency_value": 3,
    "frequency_unit": "years",
    "notes": "Group Size 48 H6"
  }' | python3 -m json.tool
```

### Log maintenance
```bash
curl -X POST http://localhost:5001/api/maintenance-logs \
  -H "Content-Type: application/json" \
  -d '{
    "maintenance_item_id": 1,
    "date_performed": "2024-11-27",
    "mileage": 20000,
    "notes": "Replaced battery"
  }' | python3 -m json.tool
```

---

## Expected Results

### Successful Tests

All pytest tests should pass with output like:
```
======================== test session starts ========================
collected 17 items

tests/test_vehicles.py ......                                  [ 35%]
tests/test_maintenance_items.py ......                         [ 70%]
tests/test_maintenance_logs.py .....                           [100%]

======================== 17 passed in 0.45s ========================
```

### Common Issues

**Port 5001 not responding:**
- Make sure Docker containers are running: `docker-compose ps`
- Check logs: `docker-compose logs backend`

**Database errors:**
- The test suite uses an in-memory database, so it won't affect your main database
- For manual tests, you may need to delete test data between runs

**Import errors in tests:**
- Make sure you're running pytest inside the container: `docker-compose exec backend pytest`

---

## Test Coverage

Current test coverage:
- ✅ Vehicle CRUD operations
- ✅ Maintenance Item CRUD operations
- ✅ Maintenance Log CRUD operations
- ✅ Automatic mileage updates
- ✅ Relationship cascading (deleting vehicle deletes items and logs)
- ✅ Error handling (404s)
- ❌ File upload (receipts) - Coming in Phase 6
- ❌ User authentication - Coming in Phase 7

---

## Next Steps

Once tests pass, you're ready to move on to Phase 3: Building the Add Vehicle UI!
