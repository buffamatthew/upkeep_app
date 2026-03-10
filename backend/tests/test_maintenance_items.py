import json
import pytest


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


def test_create_maintenance_item(client, sample_asset):
    """Test creating a maintenance item"""
    item_data = {
        'asset_id': sample_asset['id'],
        'name': 'Oil Change',
        'maintenance_type': 'usage',
        'frequency_value': 5000,
        'frequency_unit': 'miles',
        'notes': 'Use synthetic oil'
    }

    response = client.post('/api/maintenance-items',
                          data=json.dumps(item_data),
                          content_type='application/json')

    assert response.status_code == 201
    data = response.json
    assert data['name'] == 'Oil Change'
    assert data['maintenance_type'] == 'usage'
    assert data['frequency_value'] == 5000
    assert data['asset_id'] == sample_asset['id']


def test_get_maintenance_items_by_asset(client, sample_asset):
    """Test getting maintenance items for a specific asset"""
    item1_data = {
        'asset_id': sample_asset['id'],
        'name': 'Oil Change',
        'maintenance_type': 'usage',
        'frequency_value': 5000,
        'frequency_unit': 'miles'
    }

    item2_data = {
        'asset_id': sample_asset['id'],
        'name': 'Tire Rotation',
        'maintenance_type': 'usage',
        'frequency_value': 10000,
        'frequency_unit': 'miles'
    }

    client.post('/api/maintenance-items',
               data=json.dumps(item1_data),
               content_type='application/json')

    client.post('/api/maintenance-items',
               data=json.dumps(item2_data),
               content_type='application/json')

    response = client.get(f'/api/maintenance-items?asset_id={sample_asset["id"]}')
    assert response.status_code == 200
    data = response.json
    assert len(data) == 2
    assert any(item['name'] == 'Oil Change' for item in data)
    assert any(item['name'] == 'Tire Rotation' for item in data)


def test_update_maintenance_item(client, sample_asset):
    """Test updating a maintenance item"""
    item_data = {
        'asset_id': sample_asset['id'],
        'name': 'Air Filter',
        'maintenance_type': 'usage',
        'frequency_value': 15000,
        'frequency_unit': 'miles'
    }

    create_response = client.post('/api/maintenance-items',
                                  data=json.dumps(item_data),
                                  content_type='application/json')
    item_id = create_response.json['id']

    update_data = {
        'frequency_value': 20000,
        'notes': 'Updated frequency'
    }

    response = client.put(f'/api/maintenance-items/{item_id}',
                         data=json.dumps(update_data),
                         content_type='application/json')

    assert response.status_code == 200
    data = response.json
    assert data['frequency_value'] == 20000
    assert data['notes'] == 'Updated frequency'


def test_delete_maintenance_item(client, sample_asset):
    """Test deleting a maintenance item"""
    item_data = {
        'asset_id': sample_asset['id'],
        'name': 'Brake Pads',
        'maintenance_type': 'usage',
        'frequency_value': 30000,
        'frequency_unit': 'miles'
    }

    create_response = client.post('/api/maintenance-items',
                                  data=json.dumps(item_data),
                                  content_type='application/json')
    item_id = create_response.json['id']

    response = client.delete(f'/api/maintenance-items/{item_id}')
    assert response.status_code == 204

    get_response = client.get(f'/api/maintenance-items/{item_id}')
    assert get_response.status_code == 404


def test_create_time_based_maintenance(client, sample_asset):
    """Test creating a time-based maintenance item"""
    item_data = {
        'asset_id': sample_asset['id'],
        'name': 'Battery Replacement',
        'maintenance_type': 'time',
        'frequency_value': 3,
        'frequency_unit': 'years',
        'notes': 'Group Size 48 H6'
    }

    response = client.post('/api/maintenance-items',
                          data=json.dumps(item_data),
                          content_type='application/json')

    assert response.status_code == 201
    data = response.json
    assert data['maintenance_type'] == 'time'
    assert data['frequency_unit'] == 'years'
