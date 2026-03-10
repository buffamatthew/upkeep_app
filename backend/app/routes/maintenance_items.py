from flask import Blueprint, request, jsonify
from app import db
from app.models import MaintenanceItem, Asset

bp = Blueprint('maintenance_items', __name__, url_prefix='/api/maintenance-items')

@bp.route('', methods=['GET'])
def get_maintenance_items():
    asset_id = request.args.get('asset_id', type=int)
    if asset_id:
        items = MaintenanceItem.query.filter_by(asset_id=asset_id).all()
    else:
        items = MaintenanceItem.query.all()
    return jsonify([item.to_dict() for item in items])

@bp.route('/<int:item_id>', methods=['GET'])
def get_maintenance_item(item_id):
    item = MaintenanceItem.query.get_or_404(item_id)
    return jsonify(item.to_dict())

@bp.route('', methods=['POST'])
def create_maintenance_item():
    data = request.get_json()

    # Verify asset exists
    Asset.query.get_or_404(data['asset_id'])

    item = MaintenanceItem(
        asset_id=data['asset_id'],
        name=data['name'],
        maintenance_type=data.get('maintenance_type', 'time'),
        frequency_value=data['frequency_value'],
        frequency_unit=data['frequency_unit'],
        notes=data.get('notes')
    )

    db.session.add(item)
    db.session.commit()

    return jsonify(item.to_dict()), 201

@bp.route('/<int:item_id>', methods=['PUT'])
def update_maintenance_item(item_id):
    item = MaintenanceItem.query.get_or_404(item_id)
    data = request.get_json()

    item.name = data.get('name', item.name)
    item.maintenance_type = data.get('maintenance_type', item.maintenance_type)
    item.frequency_value = data.get('frequency_value', item.frequency_value)
    item.frequency_unit = data.get('frequency_unit', item.frequency_unit)
    item.notes = data.get('notes', item.notes)

    db.session.commit()

    return jsonify(item.to_dict())

@bp.route('/<int:item_id>', methods=['DELETE'])
def delete_maintenance_item(item_id):
    item = MaintenanceItem.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()

    return '', 204
