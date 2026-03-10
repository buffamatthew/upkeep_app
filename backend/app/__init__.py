from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from config import Config

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)

    # Register blueprints
    from app.routes import assets, maintenance_items, maintenance_logs, general_maintenance, backup
    app.register_blueprint(assets.bp)
    app.register_blueprint(maintenance_items.bp)
    app.register_blueprint(maintenance_logs.bp)
    app.register_blueprint(general_maintenance.bp)
    app.register_blueprint(backup.bp)

    # Create upload and instance folders if they don't exist
    import os
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['INSTANCE_FOLDER'], exist_ok=True)

    # Route to serve uploaded files
    @app.route('/uploads/<filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    return app

from app import models
