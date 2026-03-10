from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models import GeneralMaintenance, Asset, Attachment
from datetime import datetime
from werkzeug.utils import secure_filename
import os

bp = Blueprint('general_maintenance', __name__, url_prefix='/api/general-maintenance')

UPLOAD_FOLDER = 'uploads'

def allowed_file(filename, app):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def validate_file_size(file, app):
    """Check if file size is within limit"""
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    return size <= app.config['MAX_ATTACHMENT_SIZE']

@bp.route('', methods=['GET'])
def get_all():
    """Get all general maintenance records, optionally filtered by asset_id"""
    asset_id = request.args.get('asset_id', type=int)

    if asset_id:
        records = GeneralMaintenance.query.filter_by(asset_id=asset_id).order_by(GeneralMaintenance.date_performed.desc()).all()
    else:
        records = GeneralMaintenance.query.order_by(GeneralMaintenance.date_performed.desc()).all()

    return jsonify([record.to_dict() for record in records]), 200

@bp.route('/<int:id>', methods=['GET'])
def get_one(id):
    """Get a specific general maintenance record"""
    record = GeneralMaintenance.query.get_or_404(id)
    return jsonify(record.to_dict()), 200

@bp.route('', methods=['POST'])
def create():
    """Create a new general maintenance record"""
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form.to_dict()
        files = request.files.getlist('attachments')
    else:
        data = request.get_json()
        files = []

    if not data.get('asset_id') or not data.get('description') or not data.get('date_performed'):
        return jsonify({'error': 'Missing required fields'}), 400

    asset = Asset.query.get(data['asset_id'])
    if not asset:
        return jsonify({'error': 'Asset not found'}), 404

    record = GeneralMaintenance(
        asset_id=int(data['asset_id']),
        description=data['description'],
        date_performed=datetime.fromisoformat(data['date_performed']),
        usage_reading=int(data['usage_reading']) if data.get('usage_reading') else None,
        cost=float(data['cost']) if data.get('cost') else None,
        notes=data.get('notes')
    )

    db.session.add(record)
    db.session.flush()

    if len(files) > current_app.config['MAX_ATTACHMENTS_PER_LOG']:
        return jsonify({'error': f"Maximum {current_app.config['MAX_ATTACHMENTS_PER_LOG']} attachments allowed"}), 400

    for file in files:
        if file and file.filename and allowed_file(file.filename, current_app):
            if not validate_file_size(file, current_app):
                return jsonify({'error': f"File {file.filename} exceeds maximum size of {current_app.config['MAX_ATTACHMENT_SIZE'] / (1024*1024)}MB"}), 400

            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            unique_filename = f"{timestamp}_{filename}"
            filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
            file.save(filepath)

            attachment = Attachment(
                filename=filename,
                file_path=filepath,
                file_type=file.content_type,
                file_size=os.path.getsize(filepath),
                general_maintenance_id=record.id
            )
            db.session.add(attachment)
        elif file and file.filename:
            return jsonify({'error': f"File type not allowed for {file.filename}"}), 400

    # Update asset usage if this is higher
    if record.usage_reading and asset.usage_metric and record.usage_reading > asset.current_usage:
        asset.current_usage = record.usage_reading

    db.session.commit()

    return jsonify(record.to_dict()), 201

@bp.route('/<int:id>', methods=['PUT'])
def update(id):
    """Update a general maintenance record"""
    record = GeneralMaintenance.query.get_or_404(id)

    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form.to_dict()
        files = request.files.getlist('attachments')
    else:
        data = request.get_json()
        files = []

    if 'description' in data:
        record.description = data['description']
    if 'date_performed' in data:
        record.date_performed = datetime.fromisoformat(data['date_performed'])
    if 'usage_reading' in data:
        record.usage_reading = int(data['usage_reading']) if data['usage_reading'] else None
    if 'cost' in data:
        record.cost = float(data['cost']) if data['cost'] else None
    if 'notes' in data:
        record.notes = data.get('notes')

    total_attachments = len(record.attachments) + len(files)
    if total_attachments > current_app.config['MAX_ATTACHMENTS_PER_LOG']:
        return jsonify({'error': f"Maximum {current_app.config['MAX_ATTACHMENTS_PER_LOG']} attachments allowed"}), 400

    for file in files:
        if file and file.filename and allowed_file(file.filename, current_app):
            if not validate_file_size(file, current_app):
                return jsonify({'error': f"File {file.filename} exceeds maximum size of {current_app.config['MAX_ATTACHMENT_SIZE'] / (1024*1024)}MB"}), 400

            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            unique_filename = f"{timestamp}_{filename}"
            filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
            file.save(filepath)

            attachment = Attachment(
                filename=filename,
                file_path=filepath,
                file_type=file.content_type,
                file_size=os.path.getsize(filepath),
                general_maintenance_id=record.id
            )
            db.session.add(attachment)
        elif file and file.filename:
            return jsonify({'error': f"File type not allowed for {file.filename}"}), 400

    db.session.commit()

    return jsonify(record.to_dict()), 200

@bp.route('/<int:id>', methods=['DELETE'])
def delete(id):
    """Delete a general maintenance record"""
    record = GeneralMaintenance.query.get_or_404(id)

    for attachment in record.attachments:
        if os.path.exists(attachment.file_path):
            os.remove(attachment.file_path)

    db.session.delete(record)
    db.session.commit()

    return '', 204

@bp.route('/attachments/<int:id>', methods=['DELETE'])
def delete_attachment(id):
    """Delete a specific attachment"""
    attachment = Attachment.query.get_or_404(id)

    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)

    db.session.delete(attachment)
    db.session.commit()

    return '', 204
