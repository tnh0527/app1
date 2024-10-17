from flask import Flask
from flask_cors import CORS
from flask_marshmallow import Marshmallow
from datetime import timedelta
import os
from .db import init_db
from .Login import login_bp
from .Profile import profile_bp
from .Schedule import schedule_bp


ma = Marshmallow()


def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv("SECRET_KEY", "default_secret_key")
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=7)

    init_db(app)

    CORS(app, supports_credentials=True)
    ma.init_app(app)

    app.register_blueprint(login_bp, url_prefix="/auth")
    app.register_blueprint(profile_bp, url_prefix="/user")
    app.register_blueprint(schedule_bp, url_prefix="/events")

    return app
