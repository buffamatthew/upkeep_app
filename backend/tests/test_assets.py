import json
import pytest


def test_get_assets_empty(client):
    """Test getting assets when database is empty"""
    response = client.get('/api/assets')
    assert response.status_code == 200
    assert response.json == []


def test_create_asset(client):
    """Test creating a new asset"""
    asset_data = {
        'name': '2020 Toyota Camry',
        'description': 'Family sedan',
        'category': 'Vehicle',
        'location': 'Garage',
        'usage_metric': 'miles',
        'current_usage': 25000
    }

    response = client.post('/api/assets',
                          data=json.dumps(asset_data),
                          content_type='application/json')

    assert response.status_code == 201
    data = response.json
    assert data['name'] == '2020 Toyota Camry'
    assert data['category'] == 'Vehicle'
    assert data['usage_metric'] == 'miles'
    assert data['current_usage'] == 25000
    assert 'id' in data


def test_get_asset_by_id(client):
    """Test getting a specific asset by ID"""
    asset_data = {
        'name': 'HVAC System',
        'category': 'Appliance',
        'location': 'Basement'
    }

    create_response = client.post('/api/assets',
                                  data=json.dumps(asset_data),
                                  content_type='application/json')
    asset_id = create_response.json['id']

    response = client.get(f'/api/assets/{asset_id}')
    assert response.status_code == 200
    data = response.json
    assert data['id'] == asset_id
    assert data['name'] == 'HVAC System'


def test_update_asset(client):
    """Test updating an asset"""
    asset_data = {
        'name': 'Lawn Mower',
        'category': 'Equipment',
        'usage_metric': 'hours',
        'current_usage': 50
    }

    create_response = client.post('/api/assets',
                                  data=json.dumps(asset_data),
                                  content_type='application/json')
    asset_id = create_response.json['id']

    update_data = {
        'current_usage': 75
    }

    response = client.put(f'/api/assets/{asset_id}',
                         data=json.dumps(update_data),
                         content_type='application/json')

    assert response.status_code == 200
    data = response.json
    assert data['current_usage'] == 75
    assert data['name'] == 'Lawn Mower'


def test_delete_asset(client):
    """Test deleting an asset"""
    asset_data = {
        'name': 'Guest Bathroom',
        'category': 'Room',
        'location': '1st Floor'
    }

    create_response = client.post('/api/assets',
                                  data=json.dumps(asset_data),
                                  content_type='application/json')
    asset_id = create_response.json['id']

    response = client.delete(f'/api/assets/{asset_id}')
    assert response.status_code == 204

    get_response = client.get(f'/api/assets/{asset_id}')
    assert get_response.status_code == 404


def test_get_asset_not_found(client):
    """Test getting a non-existent asset"""
    response = client.get('/api/assets/999')
    assert response.status_code == 404
