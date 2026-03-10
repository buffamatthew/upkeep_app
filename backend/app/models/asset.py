from app import db
from datetime import datetime

class Asset(db.Model):
    __tablename__ = 'assets'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100))
    location = db.Column(db.String(200))
    usage_metric = db.Column(db.String(50))  # e.g., 'miles', 'hours', 'cycles' — None means time-only
    current_usage = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    maintenance_items = db.relationship('MaintenanceItem', backref='asset', lazy=True, cascade='all, delete-orphan')
    general_maintenance = db.relationship('GeneralMaintenance', backref='asset', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'location': self.location,
            'usage_metric': self.usage_metric,
            'current_usage': self.current_usage,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Asset {self.name}>'
