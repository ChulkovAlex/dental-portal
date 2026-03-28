from flask import Flask

from portal.routes.ident_api import bp as ident_bp
from portal.routes.nextcloud_api import bp as nextcloud_bp
from portal.routes.security_api import bp as security_bp
from portal.routes.talk_api import bp as talk_bp


def create_app() -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.register_blueprint(ident_bp)
    app.register_blueprint(security_bp)
    app.register_blueprint(talk_bp)
    app.register_blueprint(nextcloud_bp)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
