import json
import pytest
from datetime import date


@pytest.fixture
def sample_asset(client):
    """Create a sample asset for testing"""
    asset_data = {
        'name': '2020 Toyota Camry',
        'category': 'Vehicle',
        'usage_metric': 'miles',
        'current_usage': 25000
    }

    response = client.post('/api/assets',
                          data=json.dumps(asset_data),
                          content_type='application/json')
    return response.json


@pytest.fixture
def sample_maintenance_item(client, sample_asset):
    """Create a sample maintenance item for testing"""
    item_data = {
        'asset_id': sample_asset['id'],
        'name': 'Oil Change',
        'maintenance_type': 'usage',
        'frequency_value': 5000,
        'frequency_unit': 'miles'
    }

    response = client.post('/api/maintenance-items',
                          data=json.dumps(item_data),
                          content_type='application/json')
    return response.json


def test_create_maintenance_log(client, sample_maintenance_item, sample_asset):
    """Test creating a maintenance log"""
    log_data = {
        'maintenance_item_id': sample_maintenance_item['id'],
        'date_performed': date.today().isoformat(),
        'usage_reading': 30000,
        'notes': 'Changed oil and filter'
    }

    response = client.post('/api/maintenance-logs',
                          data=json.dumps(log_data),
                          content_type='application/json')

    assert response.status_code == 201
    data = response.json
    assert data['maintenance_item_id'] == sample_maintenance_item['id']
    assert data['usage_reading'] == 30000
    assert data['notes'] == 'Changed oil and filter'


def test_asset_usage_update(client, sample_maintenance_item, sample_asset):
    """Test that asset usage updates when logging maintenance"""
    log_data = {
        'maintenance_item_id': sample_maintenance_item['id'],
        'date_performed': date.today().isoformat(),
        'usage_reading': 35000,
        'notes': 'Oil change'
    }

    client.post('/api/maintenance-logs',
               data=json.dumps(log_data),
               content_type='application/json')

    asset_response = client.get(f'/api/assets/{sample_asset["id"]}')
    asset = asset_response.json
    assert asset['current_usage'] == 35000


def test_get_maintenance_logs(client, sample_maintenance_item):
    """Test getting maintenance logs for an item"""
    log1_data = {
        'maintenance_item_id': sample_maintenance_item['id'],
        'date_performed': '2024-01-15',
        'usage_reading': 30000
    }

    log2_data = {
        'maintenance_item_id': sample_maintenance_item['id'],
        'date_performed': '2024-06-15',
        'usage_reading': 35000
    }

    client.post('/api/maintenance-logs',
               data=json.dumps(log1_data),
               content_type='application/json')

    client.post('/api/maintenance-logs',
               data=json.dumps(log2_data),
               content_type='application/json')

    response = client.get(f'/api/maintenance-logs?maintenance_item_id={sample_maintenance_item["id"]}')
    assert response.status_code == 200
    data = response.json
    assert len(data) == 2


def test_delete_maintenance_log(client, sample_maintenance_item):
    """Test deleting a maintenance log"""
    log_data = {
        'maintenance_item_id': sample_maintenance_item['id'],
        'date_performed': date.today().isoformat(),
        'usage_reading': 30000
    }

    create_response = client.post('/api/maintenance-logs',
                                  data=json.dumps(log_data),
                                  content_type='application/json')
    log_id = create_response.json['id']

    response = client.delete(f'/api/maintenance-logs/{log_id}')
    assert response.status_code == 204

    get_response = client.get(f'/api/maintenance-logs/{log_id}')
    assert get_response.status_code == 404
