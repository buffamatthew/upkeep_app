#!/bin/bash

# Upkeep API Test Script
# Make sure the application is running with: docker-compose up

BASE_URL="http://localhost:5001/api"

echo "======================================"
echo "Upkeep API Tests"
echo "======================================"
echo ""

# Test 1: Get all assets (should be empty initially)
echo "Test 1: GET /api/assets (should be empty)"
curl -s -X GET "${BASE_URL}/assets" | python3 -m json.tool
echo ""
echo ""

# Test 2: Create an asset
echo "Test 2: POST /api/assets (create Toyota Camry)"
ASSET_RESPONSE=$(curl -s -X POST "${BASE_URL}/assets" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2020 Toyota Camry",
    "description": "Family sedan",
    "category": "Vehicle",
    "location": "Garage",
    "usage_metric": "miles",
    "current_usage": 25000
  }')
echo "$ASSET_RESPONSE" | python3 -m json.tool
ASSET_ID=$(echo "$ASSET_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo ""
echo "Created asset with ID: $ASSET_ID"
echo ""

# Test 3: Get the asset we just created
echo "Test 3: GET /api/assets/${ASSET_ID}"
curl -s -X GET "${BASE_URL}/assets/${ASSET_ID}" | python3 -m json.tool
echo ""
echo ""

# Test 4: Create a maintenance item for the asset
echo "Test 4: POST /api/maintenance-items (create Oil Change)"
ITEM_RESPONSE=$(curl -s -X POST "${BASE_URL}/maintenance-items" \
  -H "Content-Type: application/json" \
  -d "{
    \"asset_id\": ${ASSET_ID},
    \"name\": \"Oil Change\",
    \"maintenance_type\": \"usage\",
    \"frequency_value\": 5000,
    \"frequency_unit\": \"miles\",
    \"notes\": \"Use 5W-30 synthetic oil\"
  }")
echo "$ITEM_RESPONSE" | python3 -m json.tool
ITEM_ID=$(echo "$ITEM_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo ""
echo "Created maintenance item with ID: $ITEM_ID"
echo ""

# Test 5: Create another maintenance item
echo "Test 5: POST /api/maintenance-items (create Tire Rotation)"
ITEM2_RESPONSE=$(curl -s -X POST "${BASE_URL}/maintenance-items" \
  -H "Content-Type: application/json" \
  -d "{
    \"asset_id\": ${ASSET_ID},
    \"name\": \"Tire Rotation\",
    \"maintenance_type\": \"usage\",
    \"frequency_value\": 10000,
    \"frequency_unit\": \"miles\"
  }")
echo "$ITEM2_RESPONSE" | python3 -m json.tool
ITEM2_ID=$(echo "$ITEM2_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo ""
echo ""

# Test 6: Get all maintenance items for the asset
echo "Test 6: GET /api/maintenance-items?asset_id=${ASSET_ID}"
curl -s -X GET "${BASE_URL}/maintenance-items?asset_id=${ASSET_ID}" | python3 -m json.tool
echo ""
echo ""

# Test 7: Create a maintenance log
echo "Test 7: POST /api/maintenance-logs (log oil change)"
LOG_RESPONSE=$(curl -s -X POST "${BASE_URL}/maintenance-logs" \
  -H "Content-Type: application/json" \
  -d "{
    \"maintenance_item_id\": ${ITEM_ID},
    \"date_performed\": \"2024-11-27\",
    \"usage_reading\": 30000,
    \"notes\": \"Completed oil change at local shop\"
  }")
echo "$LOG_RESPONSE" | python3 -m json.tool
LOG_ID=$(echo "$LOG_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo ""
echo "Created maintenance log with ID: $LOG_ID"
echo ""

# Test 8: Verify asset usage was updated
echo "Test 8: GET /api/assets/${ASSET_ID} (verify usage updated)"
curl -s -X GET "${BASE_URL}/assets/${ASSET_ID}" | python3 -m json.tool
echo ""
echo "NOTE: current_usage should now be 30000"
echo ""

# Test 9: Get maintenance logs for the item
echo "Test 9: GET /api/maintenance-logs?maintenance_item_id=${ITEM_ID}"
curl -s -X GET "${BASE_URL}/maintenance-logs?maintenance_item_id=${ITEM_ID}" | python3 -m json.tool
echo ""
echo ""

# Test 10: Update asset usage
echo "Test 10: PUT /api/assets/${ASSET_ID} (update usage)"
curl -s -X PUT "${BASE_URL}/assets/${ASSET_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "current_usage": 32000
  }' | python3 -m json.tool
echo ""
echo ""

echo "======================================"
echo "All tests completed!"
echo "======================================"
echo ""
echo "Summary:"
echo "- Created asset ID: $ASSET_ID"
echo "- Created maintenance items: $ITEM_ID (Oil Change), $ITEM2_ID (Tire Rotation)"
echo "- Created maintenance log: $LOG_ID"
echo ""
echo "To clean up, you can delete the asset (this will cascade delete items and logs):"
echo "curl -X DELETE ${BASE_URL}/assets/${ASSET_ID}"
