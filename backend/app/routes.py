from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func,case
from io import BytesIO
import pandas as pd 
from reportlab.pdfgen import canvas

from . import db
from .models import Subscription, BillingCycle


api_bp = Blueprint("api", __name__)


def get_current_user_id() -> int:
    return int(get_jwt_identity())


# Subscriptions CRUD
@api_bp.get("/subscriptions")
@jwt_required()
def list_subscriptions():
    user_id = get_current_user_id()
    subs = Subscription.query.filter_by(user_id=user_id).order_by(Subscription.next_payment.asc()).all()
    return jsonify([serialize_sub(s) for s in subs])


@api_bp.post("/subscriptions")
@jwt_required()
def create_subscription():
    data = request.get_json() or {}
    try:
        sub = Subscription(
            user_id=get_current_user_id(),
            name=data["name"],
            cost=data["cost"],
            category=data.get("category", "General"),
            billing_cycle=BillingCycle(data.get("billing_cycle", "monthly")),
            next_payment=datetime.fromisoformat(data["next_payment"]).date(),
            notes=data.get("notes"),
        )
        db.session.add(sub)
        db.session.commit()
        return jsonify(serialize_sub(sub)), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({"message": str(exc)}), 400


@api_bp.put("/subscriptions/<int:sub_id>")
@jwt_required()
def update_subscription(sub_id: int):
    user_id = get_current_user_id()
    sub = Subscription.query.filter_by(id=sub_id, user_id=user_id).first_or_404()
    data = request.get_json() or {}
    for key in ["name", "cost", "category", "notes"]:
        if key in data:
            setattr(sub, key, data[key])
    if "billing_cycle" in data:
        sub.billing_cycle = BillingCycle(data["billing_cycle"])  # type: ignore
    if "next_payment" in data:
        sub.next_payment = datetime.fromisoformat(data["next_payment"]).date()
    db.session.commit()
    return jsonify(serialize_sub(sub))


@api_bp.delete("/subscriptions/<int:sub_id>")
@jwt_required()
def delete_subscription(sub_id: int):
    user_id = get_current_user_id()
    sub = Subscription.query.filter_by(id=sub_id, user_id=user_id).first_or_404()
    db.session.delete(sub)
    db.session.commit()
    return jsonify({"message": "deleted"})


def serialize_sub(s: Subscription) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "cost": float(s.cost),
        "category": s.category,
        "billing_cycle": s.billing_cycle.value,
        "next_payment": s.next_payment.isoformat(),
        "notes": s.notes or "",
        "monthly_cost": s.monthly_cost(),
        "annual_cost": s.annual_cost(),
        "overdue": s.next_payment < datetime.utcnow().date(),
        "due_within_7": s.is_due_within(7),
    }


# Analytics
@api_bp.get("/analytics/summary")
@jwt_required()
def analytics_summary():
    user_id = get_current_user_id()
    subs = Subscription.query.filter_by(user_id=user_id).all()
    monthly_total = sum(s.monthly_cost() for s in subs)
    annual_total = sum(s.annual_cost() for s in subs)
    active_count = len(subs)
    return jsonify({
        "monthly_total": monthly_total,
        "annual_total": annual_total,
        "active_subscriptions": active_count,
    })


@api_bp.get("/analytics/category-breakdown")
@jwt_required()
def category_breakdown():
    user_id = get_current_user_id()

    # Define the monthly cost calculation using a SQL CASE statement.
    # This tells the database: "IF the cycle is 'yearly', THEN use cost/12, ELSE just use the cost."
    monthly_cost_expression = case(
        (Subscription.billing_cycle == BillingCycle.yearly, Subscription.cost / 12.0),
        else_=Subscription.cost
    )

    rows = (
        db.session.query(
            Subscription.category,
            func.sum(monthly_cost_expression).label("total_monthly"), # Use our new calculation here
            func.count(Subscription.id)
        )
        .filter(Subscription.user_id == user_id)
        .group_by(Subscription.category)
        .all()
    
    )
    result = [{"category": c, "total": float(t), "count": n} for c, t, n in rows]
    return jsonify(result)


# Reminders
@api_bp.get("/reminders/upcoming")
@jwt_required()
def reminders_upcoming():
    user_id = get_current_user_id()
    horizon = int(request.args.get("days", 14))
    target = datetime.utcnow().date() + timedelta(days=horizon)
    subs = (
        Subscription.query.filter(Subscription.user_id == user_id, Subscription.next_payment <= target)
        .order_by(Subscription.next_payment.asc())
        .all()
    )
    return jsonify([serialize_sub(s) for s in subs])


@api_bp.post("/reminders/notify")
@jwt_required()
def send_notification():
    # Optional webhook integration; if set, send a payload
    url = current_app.config.get("NOTIFY_WEBHOOK_URL")
    if not url:
        return jsonify({"message": "webhook not configured"}), 400
    # We keep it simple to avoid external deps; client can call this and server will forward a minimal payload
    import json, urllib.request

    payload = {"event": "subscription.reminder", "user_id": get_current_user_id()}
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:  # nosec - optional webhook
            return jsonify({"status": resp.status})
    except Exception as exc:
        return jsonify({"message": str(exc)}), 502


# Exports
@api_bp.get("/export/csv")
@jwt_required()
def export_csv():
    user_id = get_current_user_id()
    subs = Subscription.query.filter_by(user_id=user_id).all()
    df = pd.DataFrame([serialize_sub(s) for s in subs])
    buf = BytesIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return send_file(buf, mimetype="text/csv", as_attachment=True, download_name="subscriptions.csv")


@api_bp.get("/export/pdf")
@jwt_required()
def export_pdf():
    user_id = get_current_user_id()
    subs = Subscription.query.filter_by(user_id=user_id).order_by(Subscription.category, Subscription.name).all()
    buf = BytesIO()
    c = canvas.Canvas(buf)
    c.setTitle("SubscriptionSavvy Report")
    y = 800
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, y, "SubscriptionSavvy - Subscriptions Report")
    y -= 30
    c.setFont("Helvetica", 11)
    for s in subs:
        line = f"{s.category} | {s.name} | ${float(s.cost):.2f} | {s.billing_cycle.value} | next {s.next_payment.isoformat()}"
        c.drawString(40, y, line)
        y -= 16
        if y < 60:
            c.showPage()
            y = 800
            c.setFont("Helvetica", 11)
    c.showPage()
    c.save()
    buf.seek(0)
    return send_file(buf, mimetype="application/pdf", as_attachment=True, download_name="subscriptions.pdf")


from datetime import date
from dateutil.relativedelta import relativedelta

@api_bp.post("/subscriptions/<int:sub_id>/pay")
@jwt_required()
def mark_as_paid(sub_id: int):
    user_id = get_current_user_id()
    sub = Subscription.query.filter_by(id=sub_id, user_id=user_id).first_or_404()

    # Ensure we are not updating a future payment by mistake
    if sub.next_payment > date.today():
        return jsonify({"message": "Cannot mark a future payment as paid"}), 400

    # Calculate the new next_payment date
    if sub.billing_cycle == BillingCycle.monthly:
        sub.next_payment = sub.next_payment + relativedelta(months=1)
    elif sub.billing_cycle == BillingCycle.yearly:
        sub.next_payment = sub.next_payment + relativedelta(years=1)
    
    db.session.commit()
    return jsonify(serialize_sub(sub))
