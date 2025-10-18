from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from .utils import register_cli
import os

db = SQLAlchemy()
jwt = JWTManager()


def create_app(config_object: str = "config.Config") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object)

    CORS(app, resources={r"/*": {"origins": app.config.get("CORS_ORIGINS", "*")}})

    db.init_app(app)
    jwt.init_app(app)

    from .routes import api_bp
    from .auth import auth_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(api_bp, url_prefix="/api")

    register_cli(app)

    return app


