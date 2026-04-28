from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db, Expense, Category, ImportHistory
from ..services.import_service import import_from_csv, import_from_excel
from ..services.export_service import generate_csv, generate_excel
from datetime import datetime
import io
import csv
import json
import os
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils.dataframe import dataframe_to_rows

importexport_bp = Blueprint('importexport', __name__)

@importexport_bp.route('/export', methods=['GET'])
@jwt_required()
def export_expenses():
    user_id = get_jwt_identity()
    format = request.args.get('format', 'csv')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    # Build query
    query = Expense.query.filter_by(user_id=user_id)
    if start_date:
        try:
            query = query.filter(Expense.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
        except:
            return jsonify({'error': 'Invalid start date format'}), 400
    if end_date:
        try:
            query = query.filter(Expense.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
        except:
            return jsonify({'error': 'Invalid end date format'}), 400

    expenses = query.all()

    # Generate filename
    if start_date and end_date:
        filename = f"expenses_{start_date}_to_{end_date}"
    else:
        filename = f"expenses_all_{datetime.now().strftime('%Y%m%d')}"

    if format == 'csv':
        csv_data = generate_csv(expenses)
        return send_file(
            io.BytesIO(csv_data),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'{filename}.csv'
        )
    
    elif format == 'json':
        # Generate JSON
        data = [exp.to_dict() for exp in expenses]
        json_data = json.dumps(data, indent=2, default=str)
        return send_file(
            io.BytesIO(json_data.encode('utf-8')),
            mimetype='application/json',
            as_attachment=True,
            download_name=f'{filename}.json'
        )
    
    elif format == 'xlsx':
        # Generate Excel file
        excel_data = generate_excel(expenses)
        return send_file(
            io.BytesIO(excel_data),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'{filename}.xlsx'
        )
    
    else:
        return jsonify({'error': 'Unsupported format'}), 400


@importexport_bp.route('/import', methods=['POST'])
@jwt_required()
def import_expenses():
    user_id = get_jwt_identity()
    file = request.files.get('file')
    
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400

    # Validate file extension
    filename = file.filename
    if not filename or not (filename.endswith('.csv') or filename.endswith('.xlsx') or filename.endswith('.xls')):
        return jsonify({'error': 'Invalid file format. Please upload CSV or Excel file'}), 400

    # Check file size (max 10MB)
    file.seek(0, 2)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > 10 * 1024 * 1024:
        return jsonify({'error': 'File size exceeds 10MB limit'}), 400

    try:
        print(f"Starting import for user {user_id}, file: {filename}")
        
        # Choose import method based on file extension
        if filename.endswith('.csv'):
            count, errors = import_from_csv(file, user_id)
        else:  # Excel files (.xlsx, .xls)
            count, errors = import_from_excel(file, user_id)
        
        print(f"Import complete. Count: {count}, Errors: {len(errors)}")
        
        # Record import history
        history_entry = ImportHistory(
            user_id=user_id,
            filename=filename,
            record_count=count,
            error_count=len(errors),
            status='success' if len(errors) == 0 else 'warning' if count > 0 else 'error',
            errors=','.join(errors) if errors else None
        )
        db.session.add(history_entry)
        db.session.commit()
        
        response = {
            'imported': count,
            'errors': errors,
            'history_id': history_entry.id
        }
        
        if count == 0 and len(errors) > 0:
            return jsonify(response), 400
        elif len(errors) > 0:
            return jsonify(response), 207
        else:
            return jsonify(response), 200
        
    except Exception as e:
        print(f"Import failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({'error': f'Import failed: {str(e)}'}), 500


@importexport_bp.route('/history', methods=['GET'])
@jwt_required()
def get_import_history():
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 50, type=int)
    
    history = ImportHistory.query.filter_by(user_id=user_id)\
        .order_by(ImportHistory.created_at.desc())\
        .limit(limit)\
        .all()
    
    result = []
    for h in history:
        errors_list = []
        if h.errors:
            try:
                errors_list = json.loads(h.errors)
            except json.JSONDecodeError:
                errors_list = h.errors.split(',') if h.errors else []
        
        result.append({
            'id': h.id,
            'date': h.created_at.isoformat(),
            'file': h.filename,
            'count': h.record_count,
            'status': h.status,
            'errors': errors_list
        })
    
    return jsonify(result), 200


@importexport_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_export_stats():
    user_id = get_jwt_identity()
    
    total_records = Expense.query.filter_by(user_id=user_id).count()
    
    last_import = ImportHistory.query.filter_by(user_id=user_id)\
        .order_by(ImportHistory.created_at.desc())\
        .first()
    
    total_imports = ImportHistory.query.filter_by(user_id=user_id).count()
    
    return jsonify({
        'totalRecords': total_records,
        'lastImport': last_import.created_at.isoformat() if last_import else None,
        'lastExport': None,
        'totalImports': total_imports,
        'totalExports': 0
    }), 200


@importexport_bp.route('/history/<int:history_id>', methods=['GET'])
@jwt_required()
def get_import_history_detail(history_id):
    user_id = get_jwt_identity()
    
    history = ImportHistory.query.filter_by(id=history_id, user_id=user_id).first()
    if not history:
        return jsonify({'error': 'Import history not found'}), 404
    
    errors_list = []
    if history.errors:
        try:
            errors_list = json.loads(history.errors)
        except json.JSONDecodeError:
            errors_list = history.errors.split(',') if history.errors else []
    
    return jsonify({
        'id': history.id,
        'date': history.created_at.isoformat(),
        'file': history.filename,
        'count': history.record_count,
        'status': history.status,
        'errors': errors_list
    }), 200


@importexport_bp.route('/history/<int:history_id>', methods=['DELETE'])
@jwt_required()
def delete_import_history_item(history_id):
    user_id = get_jwt_identity()
    
    history = ImportHistory.query.filter_by(id=history_id, user_id=user_id).first()
    if not history:
        return jsonify({'error': 'Import history not found'}), 404
    
    db.session.delete(history)
    db.session.commit()
    
    return jsonify({'message': 'Import history deleted successfully'}), 200


@importexport_bp.route('/history/clear', methods=['DELETE'])
@jwt_required()
def clear_import_history():
    user_id = get_jwt_identity()
    
    ImportHistory.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    
    return jsonify({'message': 'All import history cleared successfully'}), 200