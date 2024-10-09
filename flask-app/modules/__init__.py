def register_routes(app):
    from .Login import login_bp

    app.register_blueprint(login_bp, url_prefix="/auth")
