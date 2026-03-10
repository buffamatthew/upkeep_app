from flask import Blueprint, request, jsonify, send_file
from app import db
from app.models import Asset, MaintenanceItem, MaintenanceLog, GeneralMaintenance, Attachment
from datetime import datetime
import json
import io

bp = Blueprint('backup', __name__, url_prefix='/api/backup')

@bp.route('/export', methods=['GET'])
def export_data():
    """Export all data as JSON"""
    try:
        assets = Asset.query.all()

        export_data = {
            'export_date': datetime.utcnow().isoformat(),
            'version': '2.0',
            'assets': []
        }

        for asset in assets:
            asset_data = asset.to_dict()

            # Get maintenance items for this asset
            maintenance_items = MaintenanceItem.query.filter_by(asset_id=asset.id).all()
            asset_data['maintenance_items'] = []

            for item in maintenance_items:
                item_data = item.to_dict()

                # Get logs for this maintenance item
                logs = MaintenanceLog.query.filter_by(maintenance_item_id=item.id).all()
                item_data['logs'] = []

                for log in logs:
                    log_data = log.to_dict()
                    log_data['attachments'] = [att.to_dict() for att in log.attachments]
                    item_data['logs'].append(log_data)

                asset_data['maintenance_items'].append(item_data)

            # Get general maintenance for this asset
            general_maintenance = GeneralMaintenance.query.filter_by(asset_id=asset.id).all()
            asset_data['general_maintenance'] = []

            for gm in general_maintenance:
                gm_data = gm.to_dict()
                gm_data['attachments'] = [att.to_dict() for att in gm.attachments]
                asset_data['general_maintenance'].append(gm_data)

            export_data['assets'].append(asset_data)

        json_str = json.dumps(export_data, indent=2)
        json_bytes = io.BytesIO(json_str.encode('utf-8'))

        filename = f"upkeep_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"

        return send_file(
            json_bytes,
            mimetype='application/json',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        return jsonify({'error': f'Failed to export data: {str(e)}'}), 500

@bp.route('/import', methods=['POST'])
def import_data():
    """Import data from JSON backup file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not file.filename.endswith('.json'):
            return jsonify({'error': 'File must be a JSON file'}), 400

        try:
            data = json.load(file)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid JSON file'}), 400

        # Support both old 'vehicles' and new 'assets' format
        assets_data = data.get('assets') or data.get('vehicles')
        if not assets_data:
            return jsonify({'error': 'Invalid backup file format'}), 400

        mode = request.form.get('mode', 'merge')

        if mode == 'replace':
            Attachment.query.delete()
            MaintenanceLog.query.delete()
            GeneralMaintenance.query.delete()
            MaintenanceItem.query.delete()
            Asset.query.delete()
            db.session.commit()

        imported_counts = {
            'assets': 0,
            'maintenance_items': 0,
            'maintenance_logs': 0,
            'general_maintenance': 0
        }

        for asset_data in assets_data:
            asset = Asset(
                name=asset_data.get('name') or f"{asset_data.get('year', '')} {asset_data.get('make', '')} {asset_data.get('model', '')}".strip(),
                description=asset_data.get('description'),
                category=asset_data.get('category'),
                location=asset_data.get('location'),
                usage_metric=asset_data.get('usage_metric'),
                current_usage=asset_data.get('current_usage', asset_data.get('current_mileage', 0))
            )
            db.session.add(asset)
            db.session.flush()
            imported_counts['assets'] += 1

            for item_data in asset_data.get('maintenance_items', []):
                item = MaintenanceItem(
                    asset_id=asset.id,
                    name=item_data['name'],
                    maintenance_type=item_data.get('maintenance_type', 'time'),
                    frequency_value=item_data['frequency_value'],
                    frequency_unit=item_data.get('frequency_unit'),
                    notes=item_data.get('notes')
                )
                db.session.add(item)
                db.session.flush()
                imported_counts['maintenance_items'] += 1

                for log_data in item_data.get('logs', []):
                    log = MaintenanceLog(
                        maintenance_item_id=item.id,
                        date_performed=datetime.fromisoformat(log_data['date_performed']),
                        usage_reading=log_data.get('usage_reading', log_data.get('mileage')),
                        cost=log_data.get('cost'),
                        notes=log_data.get('notes')
                    )
                    db.session.add(log)
                    db.session.flush()
                    imported_counts['maintenance_logs'] += 1

            for gm_data in asset_data.get('general_maintenance', []):
                gm = GeneralMaintenance(
                    asset_id=asset.id,
                    description=gm_data['description'],
                    date_performed=datetime.fromisoformat(gm_data['date_performed']),
                    usage_reading=gm_data.get('usage_reading', gm_data.get('mileage')),
                    cost=gm_data.get('cost'),
                    notes=gm_data.get('notes')
                )
                db.session.add(gm)
                imported_counts['general_maintenance'] += 1

        db.session.commit()

        return jsonify({
            'message': 'Data imported successfully',
            'counts': imported_counts,
            'note': 'Attachment files were not restored - only metadata. Please re-upload attachments if needed.'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to import data: {str(e)}'}), 500
