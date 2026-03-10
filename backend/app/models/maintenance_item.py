from app import db
from datetime import datetime

class MaintenanceItem(db.Model):
    __tablename__ = 'maintenance_items'

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    maintenance_type = db.Column(db.String(20), nullable=False, default='time')  # 'time' or 'usage'
    frequency_value = db.Column(db.Integer, nullable=False)
    frequency_unit = db.Column(db.String(20), nullable=False)  # 'days', 'weeks', 'months', 'years' for time; asset's usage_metric for usage
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    maintenance_logs = db.relationship('MaintenanceLog', backref='maintenance_item', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'asset_id': self.asset_id,
            'name': self.name,
            'maintenance_type': self.maintenance_type,
            'frequency_value': self.frequency_value,
            'frequency_unit': self.frequency_unit,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<MaintenanceItem {self.name} for Asset {self.asset_id}>'
