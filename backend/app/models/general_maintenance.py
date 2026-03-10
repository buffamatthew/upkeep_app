from app import db
from datetime import datetime

class GeneralMaintenance(db.Model):
    __tablename__ = 'general_maintenance'

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id'), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    date_performed = db.Column(db.Date, nullable=False)
    usage_reading = db.Column(db.Integer)  # Optional usage value at time of maintenance
    cost = db.Column(db.Numeric(10, 2))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to attachments
    attachments = db.relationship('Attachment', backref='general_maintenance', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'asset_id': self.asset_id,
            'description': self.description,
            'date_performed': self.date_performed.isoformat() if self.date_performed else None,
            'usage_reading': self.usage_reading,
            'cost': float(self.cost) if self.cost else None,
            'notes': self.notes,
            'attachments': [att.to_dict() for att in self.attachments] if self.attachments else [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<GeneralMaintenance {self.id} {self.description}>'
