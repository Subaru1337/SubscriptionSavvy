from datetime import datetime, timedelta
from enum import Enum
from werkzeug.security import generate_password_hash, check_password_hash
from . import db


class BillingCycle(str, Enum):
    monthly = "monthly"
    yearly = "yearly"


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    subscriptions = db.relationship("Subscription", backref="user", lazy=True, cascade="all, delete-orphan")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Subscription(db.Model):
    __tablename__ = "subscriptions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    cost = db.Column(db.Numeric(10, 2), nullable=False)
    category = db.Column(db.String(80), nullable=False)
    billing_cycle = db.Column(db.Enum(BillingCycle), nullable=False, default=BillingCycle.monthly)
    next_payment = db.Column(db.Date, nullable=False)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def monthly_cost(self) -> float:
        if self.billing_cycle == BillingCycle.monthly:
            return float(self.cost)
        return float(self.cost) / 12.0

    def annual_cost(self) -> float:
        if self.billing_cycle == BillingCycle.yearly:
            return float(self.cost)
        return float(self.cost) * 12.0

    def is_due_within(self, days: int) -> bool:
        return self.next_payment <= (datetime.utcnow().date() + timedelta(days=days))


