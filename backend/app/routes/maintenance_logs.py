from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app import db
from app.models import MaintenanceLog, MaintenanceItem, Asset, Attachment
from datetime import datetime
import os

bp = Blueprint('maintenance_logs', __name__, url_prefix='/api/maintenance-logs')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def validate_file_size(file):
    """Check if file size is within limit"""
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    return size <= current_app.config['MAX_ATTACHMENT_SIZE']

@bp.route('', methods=['GET'])
def get_maintenance_logs():
    item_id = request.args.get('maintenance_item_id', type=int)
    if item_id:
        logs = MaintenanceLog.query.filter_by(maintenance_item_id=item_id).order_by(MaintenanceLog.date_performed.desc()).all()
    else:
        logs = MaintenanceLog.query.order_by(MaintenanceLog.date_performed.desc()).all()
    return jsonify([log.to_dict() for log in logs])

@bp.route('/<int:log_id>', methods=['GET'])
def get_maintenance_log(log_id):
    log = MaintenanceLog.query.get_or_404(log_id)
    return jsonify(log.to_dict())

@bp.route('', methods=['POST'])
def create_maintenance_log():
    data = request.form if request.form else request.get_json()

    # Verify maintenance item exists
    item = MaintenanceItem.query.get_or_404(data['maintenance_item_id'])

    # Parse date
    date_performed = datetime.fromisoformat(data['date_performed']).date()

    # Handle legacy single file upload
    receipt_photo = None
    if 'receipt_photo' in request.files:
        file = request.files['receipt_photo']
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{timestamp}_{filename}"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            receipt_photo = filename

    # Convert usage_reading and cost to appropriate types if provided
    usage_reading = int(data.get('usage_reading')) if data.get('usage_reading') else None
    cost = float(data.get('cost')) if data.get('cost') else None

    log = MaintenanceLog(
        maintenance_item_id=data['maintenance_item_id'],
        date_performed=date_performed,
        usage_reading=usage_reading,
        cost=cost,
        notes=data.get('notes'),
        receipt_photo=receipt_photo
    )

    db.session.add(log)
    db.session.flush()

    # Handle multiple file attachments
    files = request.files.getlist('attachments')

    if len(files) > current_app.config['MAX_ATTACHMENTS_PER_LOG']:
        return jsonify({'error': f"Maximum {current_app.config['MAX_ATTACHMENTS_PER_LOG']} attachments allowed"}), 400

    for file in files:
        if file and file.filename and allowed_file(file.filename):
            if not validate_file_size(file):
                return jsonify({'error': f"File {file.filename} exceeds maximum size of {current_app.config['MAX_ATTACHMENT_SIZE'] / (1024*1024)}MB"}), 400

            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_filename = f"{timestamp}_{filename}"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)

            attachment = Attachment(
                filename=filename,
                file_path=filepath,
                file_type=file.content_type,
                file_size=os.path.getsize(filepath),
                maintenance_log_id=log.id
            )
            db.session.add(attachment)
        elif file and file.filename:
            return jsonify({'error': f"File type not allowed for {file.filename}"}), 400

    # Update asset usage if provided and higher than current
    if log.usage_reading:
        asset = Asset.query.get(item.asset_id)
        if asset and asset.usage_metric and log.usage_reading > asset.current_usage:
            asset.current_usage = log.usage_reading

    db.session.commit()

    return jsonify(log.to_dict()), 201

@bp.route('/<int:log_id>', methods=['PUT'])
def update_maintenance_log(log_id):
    log = MaintenanceLog.query.get_or_404(log_id)

    data = request.form if request.form else request.get_json()

    if 'date_performed' in data:
        log.date_performed = datetime.fromisoformat(data['date_performed']).date()

    if 'usage_reading' in data:
        log.usage_reading = int(data.get('usage_reading')) if data.get('usage_reading') else None

    if 'cost' in data:
        log.cost = float(data.get('cost')) if data.get('cost') else None

    if 'notes' in data:
        log.notes = data.get('notes')

    # Handle new file attachments
    files = request.files.getlist('attachments')

    total_attachments = len(log.attachments) + len(files)
    if total_attachments > current_app.config['MAX_ATTACHMENTS_PER_LOG']:
        return jsonify({'error': f"Maximum {current_app.config['MAX_ATTACHMENTS_PER_LOG']} attachments allowed per log"}), 400

    for file in files:
        if file and file.filename and allowed_file(file.filename):
            if not validate_file_size(file):
                return jsonify({'error': f"File {file.filename} exceeds maximum size of {current_app.config['MAX_ATTACHMENT_SIZE'] / (1024*1024)}MB"}), 400

            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_filename = f"{timestamp}_{filename}"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)

            attachment = Attachment(
                filename=filename,
                file_path=filepath,
                file_type=file.content_type,
                file_size=os.path.getsize(filepath),
                maintenance_log_id=log.id
            )
            db.session.add(attachment)
        elif file and file.filename:
            return jsonify({'error': f"File type not allowed for {file.filename}"}), 400

    # Handle receipt removal
    if data.get('remove_receipt'):
        if log.receipt_photo:
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], log.receipt_photo)
            if os.path.exists(filepath):
                os.remove(filepath)
            log.receipt_photo = None

    # Handle file upload (new receipt)
    if 'receipt_photo' in request.files:
        file = request.files['receipt_photo']
        if file and file.filename and allowed_file(file.filename):
            if log.receipt_photo:
                old_filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], log.receipt_photo)
                if os.path.exists(old_filepath):
                    os.remove(old_filepath)

            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{timestamp}_{filename}"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            log.receipt_photo = filename

    # Update asset usage if needed
    if log.usage_reading:
        item = MaintenanceItem.query.get(log.maintenance_item_id)
        asset = Asset.query.get(item.asset_id)
        if asset and asset.usage_metric and log.usage_reading > asset.current_usage:
            asset.current_usage = log.usage_reading

    db.session.commit()

    return jsonify(log.to_dict())

@bp.route('/<int:log_id>', methods=['DELETE'])
def delete_maintenance_log(log_id):
    log = MaintenanceLog.query.get_or_404(log_id)

    if log.receipt_photo:
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], log.receipt_photo)
        if os.path.exists(filepath):
            os.remove(filepath)

    for attachment in log.attachments:
        if os.path.exists(attachment.file_path):
            os.remove(attachment.file_path)

    db.session.delete(log)
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
