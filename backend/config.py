import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    # Use /app/instance for persistent data (database)
    INSTANCE_FOLDER = os.environ.get('INSTANCE_FOLDER') or os.path.join(basedir, 'instance')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(INSTANCE_FOLDER, 'upkeep.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(basedir, 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max request size

    # File attachment settings
    MAX_ATTACHMENTS_PER_LOG = 5
    MAX_ATTACHMENT_SIZE = 16 * 1024 * 1024  # 16MB per file
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf', 'gif', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'heic'}
