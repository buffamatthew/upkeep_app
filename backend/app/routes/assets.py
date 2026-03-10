from flask import Blueprint, request, jsonify
from app import db
from app.models import Asset

bp = Blueprint('assets', __name__, url_prefix='/api/assets')

@bp.route('', methods=['GET'])
def get_assets():
    assets = Asset.query.all()
    return jsonify([a.to_dict() for a in assets])

@bp.route('/<int:asset_id>', methods=['GET'])
def get_asset(asset_id):
    asset = Asset.query.get_or_404(asset_id)
    return jsonify(asset.to_dict())

@bp.route('', methods=['POST'])
def create_asset():
    data = request.get_json()

    asset = Asset(
        name=data['name'],
        description=data.get('description'),
        category=data.get('category'),
        location=data.get('location'),
        usage_metric=data.get('usage_metric'),
        current_usage=data.get('current_usage', 0)
    )

    db.session.add(asset)
    db.session.commit()

    return jsonify(asset.to_dict()), 201

@bp.route('/<int:asset_id>', methods=['PUT'])
def update_asset(asset_id):
    asset = Asset.query.get_or_404(asset_id)
    data = request.get_json()

    asset.name = data.get('name', asset.name)
    asset.description = data.get('description', asset.description)
    asset.category = data.get('category', asset.category)
    asset.location = data.get('location', asset.location)
    asset.usage_metric = data.get('usage_metric', asset.usage_metric)
    asset.current_usage = data.get('current_usage', asset.current_usage)

    db.session.commit()

    return jsonify(asset.to_dict())

@bp.route('/<int:asset_id>', methods=['DELETE'])
def delete_asset(asset_id):
    asset = Asset.query.get_or_404(asset_id)
    db.session.delete(asset)
    db.session.commit()

    return '', 204
