from app import db
from datetime import datetime

class MaintenanceLog(db.Model):
    __tablename__ = 'maintenance_logs'

    id = db.Column(db.Integer, primary_key=True)
    maintenance_item_id = db.Column(db.Integer, db.ForeignKey('maintenance_items.id'), nullable=False)
    date_performed = db.Column(db.Date, nullable=False)
    usage_reading = db.Column(db.Integer)  # Optional usage value at time of maintenance
    notes = db.Column(db.Text)
    cost = db.Column(db.Numeric(10, 2))
    receipt_photo = db.Column(db.String(255))  # Legacy field
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to attachments
    attachments = db.relationship('Attachment', backref='maintenance_log', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'maintenance_item_id': self.maintenance_item_id,
            'date_performed': self.date_performed.isoformat() if self.date_performed else None,
            'usage_reading': self.usage_reading,
            'notes': self.notes,
            'cost': float(self.cost) if self.cost else None,
            'receipt_photo': self.receipt_photo,
            'attachments': [att.to_dict() for att in self.attachments] if self.attachments else [],
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<MaintenanceLog {self.id} for Item {self.maintenance_item_id}>'
