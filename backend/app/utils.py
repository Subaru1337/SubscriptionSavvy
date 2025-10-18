from flask import Flask


def register_cli(app: Flask) -> None:
    @app.cli.command("init-db")
    def init_db_command():
        """Create database tables."""
        with app.app_context():
            from . import db  # imported here to avoid circular import at module load time
            db.create_all()
        print("Initialized the database")


