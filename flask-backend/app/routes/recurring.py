from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db, RecurringRule, Category, Expense
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from ..services.recurring_service import process_recurring

recurring_bp = Blueprint('recurring', __name__)

def calculate_next_date(rule):
    """Calculate the next occurrence date based on frequency and interval"""
    today = datetime.utcnow().date()
    next_date = rule.next_date or rule.start_date
    
    # If next_date is in the past, calculate from today
    if next_date < today:
        next_date = today
    
    if rule.frequency == 'daily':
        return next_date + timedelta(days=rule.interval)
    elif rule.frequency == 'weekly':
        return next_date + timedelta(weeks=rule.interval)
    elif rule.frequency == 'monthly':
        return next_date + relativedelta(months=rule.interval)
    elif rule.frequency == 'yearly':
        return next_date + relativedelta(years=rule.interval)
    else:
        return next_date

@recurring_bp.route('/', methods=['GET'])
@jwt_required()
def get_rules():
    user_id = int(get_jwt_identity())
    rules = RecurringRule.query.filter_by(user_id=user_id).all()
    return jsonify([r.to_dict() for r in rules]), 200

@recurring_bp.route('/', methods=['POST'])
@jwt_required()
def create_rule():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    category_id = data.get('category_id')
    amount = data.get('amount')
    description = data.get('description', '')
    frequency = data.get('frequency')
    interval = data.get('interval', 1)
    start_date = data.get('start_date')
    end_date = data.get('end_date')

    # Validation
    if not all([category_id, amount, frequency, start_date]):
        return jsonify({'error': 'Missing required fields'}), 400

    cat = Category.query.filter(
        (Category.id == category_id) & 
        ((Category.user_id == user_id) | (Category.user_id.is_(None)))
    ).first()
    if not cat:
        return jsonify({'error': 'Invalid category'}), 400

    try:
        amount = float(amount)
    except:
        return jsonify({'error': 'Invalid amount'}), 400

    try:
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
    except:
        return jsonify({'error': 'Invalid start date format. Use YYYY-MM-DD'}), 400
    
    end = None
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
        except:
            return jsonify({'error': 'Invalid end date format. Use YYYY-MM-DD'}), 400

    # Validate dates
    if end and end < start:
        return jsonify({'error': 'End date cannot be before start date'}), 400

    # Create rule
    rule = RecurringRule(
        user_id=user_id,
        category_id=category_id,
        amount=amount,
        description=description,
        frequency=frequency,
        interval=interval,
        start_date=start,
        end_date=end,
        next_date=start,
        active=True
    )
    db.session.add(rule)
    db.session.commit()

    return jsonify(rule.to_dict()), 201

@recurring_bp.route('/<int:rule_id>', methods=['PUT'])
@jwt_required()
def update_rule(rule_id):
    user_id = int(get_jwt_identity())
    rule = RecurringRule.query.filter_by(id=rule_id, user_id=user_id).first()
    if not rule:
        return jsonify({'error': 'Rule not found'}), 404

    data = request.get_json()
    
    # Update fields
    if 'category_id' in data:
        cat = Category.query.filter(
            (Category.id == data['category_id']) & 
            ((Category.user_id == user_id) | (Category.user_id.is_(None)))
        ).first()
        if not cat:
            return jsonify({'error': 'Invalid category'}), 400
        rule.category_id = data['category_id']
    
    if 'amount' in data:
        try:
            rule.amount = float(data['amount'])
        except:
            return jsonify({'error': 'Invalid amount'}), 400
    
    if 'description' in data:
        rule.description = data['description']
    
    if 'frequency' in data:
        rule.frequency = data['frequency']
    
    if 'interval' in data:
        rule.interval = data['interval']
    
    if 'start_date' in data:
        try:
            rule.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        except:
            return jsonify({'error': 'Invalid start date format'}), 400
    
    if 'end_date' in data:
        if data['end_date']:
            try:
                rule.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            except:
                return jsonify({'error': 'Invalid end date format'}), 400
        else:
            rule.end_date = None
    
    if 'active' in data:
        rule.active = data['active']
    
    # Recalculate next_date if frequency, interval, or dates changed
    if any(field in data for field in ['frequency', 'interval', 'start_date', 'end_date']):
        # Reset next_date to start_date if rule is active
        if rule.active:
            rule.next_date = rule.start_date
        else:
            rule.next_date = None
    
    db.session.commit()
    return jsonify(rule.to_dict()), 200

@recurring_bp.route('/<int:rule_id>', methods=['DELETE'])
@jwt_required()
def delete_rule(rule_id):
    user_id = int(get_jwt_identity())
    rule = RecurringRule.query.filter_by(id=rule_id, user_id=user_id).first()
    if not rule:
        return jsonify({'error': 'Rule not found'}), 404

    db.session.delete(rule)
    db.session.commit()
    return jsonify({'message': 'Rule deleted'}), 200

@recurring_bp.route('/process', methods=['POST'])
@jwt_required()
def process_now():
    """Manually trigger recurring expense generation"""
    user_id = int(get_jwt_identity())
    count = process_recurring(user_id)
    return jsonify({'message': f'Processed {count} recurring expenses', 'count': count}), 200

@recurring_bp.route('/<int:rule_id>/skip', methods=['POST'])
@jwt_required()
def skip_next_occurrence(rule_id):
    """Skip the next occurrence of a recurring rule"""
    user_id = int(get_jwt_identity())
    rule = RecurringRule.query.filter_by(id=rule_id, user_id=user_id).first()
    if not rule:
        return jsonify({'error': 'Rule not found'}), 404
    
    # Calculate next date after skipping
    rule.next_date = calculate_next_date(rule)
    db.session.commit()
    
    return jsonify({'message': 'Next occurrence skipped', 'next_date': rule.next_date.isoformat()}), 200

@recurring_bp.route('/<int:rule_id>/pause', methods=['POST'])
@jwt_required()
def pause_rule(rule_id):
    """Pause a recurring rule"""
    user_id = int(get_jwt_identity())
    rule = RecurringRule.query.filter_by(id=rule_id, user_id=user_id).first()
    if not rule:
        return jsonify({'error': 'Rule not found'}), 404
    
    rule.active = False
    db.session.commit()
    
    return jsonify({'message': 'Rule paused', 'rule': rule.to_dict()}), 200

@recurring_bp.route('/<int:rule_id>/resume', methods=['POST'])
@jwt_required()
def resume_rule(rule_id):
    """Resume a paused recurring rule"""
    user_id = int(get_jwt_identity())
    rule = RecurringRule.query.filter_by(id=rule_id, user_id=user_id).first()
    if not rule:
        return jsonify({'error': 'Rule not found'}), 404
    
    rule.active = True
    # If next_date is in the past, set it to today
    today = datetime.utcnow().date()
    if not rule.next_date or rule.next_date < today:
        rule.next_date = today
    
    db.session.commit()
    
    return jsonify({'message': 'Rule resumed', 'rule': rule.to_dict()}), 200