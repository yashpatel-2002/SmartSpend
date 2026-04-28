from datetime import datetime, timedelta
from ..models import db, RecurringRule, Expense, Notification
from dateutil.relativedelta import relativedelta

def process_recurring(user_id=None):
    """
    Generate expenses from recurring rules that are due.
    If user_id is provided, process only for that user; otherwise process all.
    Returns number of expenses created.
    """
    today = datetime.utcnow().date()
    query = RecurringRule.query.filter(
        RecurringRule.active == True, 
        RecurringRule.next_date <= today
    )
    
    if user_id:
        query = query.filter_by(user_id=user_id)

    rules = query.all()
    count = 0
    
    for rule in rules:
        # Create expense
        expense = Expense(
            user_id=rule.user_id,
            category_id=rule.category_id,
            amount=rule.amount,
            description=f"[Recurring] {rule.description}" if rule.description else "Recurring expense",
            date=today
        )
        db.session.add(expense)
        
        # Calculate next date
        if rule.frequency == 'daily':
            next_date = today + timedelta(days=rule.interval)
        elif rule.frequency == 'weekly':
            next_date = today + timedelta(weeks=rule.interval)
        elif rule.frequency == 'monthly':
            next_date = today + relativedelta(months=rule.interval)
        elif rule.frequency == 'yearly':
            next_date = today + relativedelta(years=rule.interval)
        else:
            next_date = today + timedelta(days=30)  # Default to monthly
        
        # Check if beyond end_date
        if rule.end_date and next_date > rule.end_date:
            rule.active = False
            # Set next_date to end_date instead of None to avoid NULL constraint
            rule.next_date = rule.end_date
        else:
            rule.next_date = next_date
        
        # Create notification
        notif = Notification(
            user_id=rule.user_id,
            type='recurring',
            message=f'Recurring expense of ${rule.amount:.2f} created for {rule.description or "recurring expense"}'
        )
        db.session.add(notif)
        
        db.session.add(rule)
        count += 1

    db.session.commit()
    return count