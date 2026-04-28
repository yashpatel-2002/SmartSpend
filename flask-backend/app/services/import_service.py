import csv
import io
import pandas as pd
from datetime import datetime
from ..models import db, Expense, Category

def parse_date(date_str):
    """Parse date in multiple formats"""
    date_str = str(date_str).strip()
    print(f"Attempting to parse date: '{date_str}'")  # Debug
    
    # Try different date formats
    formats = [
        '%Y-%m-%d',  # 2024-02-15
        '%d/%m/%Y',  # 15/02/2024
        '%m/%d/%Y',  # 02/15/2024
        '%d-%m-%Y',  # 15-02-2024
        '%Y/%m/%d',  # 2024/02/15
        '%d.%m.%Y',  # 15.02.2024
        '%Y%m%d',    # 20240215
        '%b %d %Y',  # Feb 15 2024
        '%B %d %Y',  # February 15 2024
        '%d-%b-%Y',  # 15-Feb-2024
    ]
    
    # If it's already a datetime object (from Excel)
    if isinstance(date_str, datetime):
        return date_str.date()
    
    for fmt in formats:
        try:
            result = datetime.strptime(date_str, fmt).date()
            print(f"Successfully parsed '{date_str}' with format '{fmt}' -> {result}")
            return result
        except ValueError:
            continue
    
    raise ValueError(f"Unable to parse date: {date_str}. Expected formats: YYYY-MM-DD or DD/MM/YYYY")

def parse_amount(amount_str):
    """Parse amount in various formats"""
    amount_str = str(amount_str).strip()
    print(f"Attempting to parse amount: '{amount_str}'")  # Debug
    
    # Remove currency symbols and spaces
    amount_str = amount_str.replace('$', '').replace('€', '').replace('£', '').replace('¥', '').replace(' ', '')
    
    # Handle different decimal separators
    if ',' in amount_str and '.' in amount_str:
        # If both present, assume last dot is decimal (European format: 1.234,56 -> 1234.56)
        if amount_str.rindex('.') < amount_str.rindex(','):
            amount_str = amount_str.replace('.', '').replace(',', '.')
    elif ',' in amount_str:
        # If only comma, it might be decimal separator (European)
        amount_str = amount_str.replace(',', '.')
    
    try:
        result = float(amount_str)
        print(f"Successfully parsed amount: '{amount_str}' -> {result}")
        return result
    except ValueError:
        raise ValueError(f"Unable to parse amount: {amount_str}")

def import_from_csv(file_stream, user_id):
    """
    Parse CSV and create expenses for the user.
    Returns tuple (imported_count, errors_list).
    """
    # Reset file pointer to beginning
    file_stream.seek(0)
    
    # Read and decode content
    content = file_stream.read()
    print(f"File size: {len(content)} bytes")  # Debug
    
    if isinstance(content, bytes):
        content = content.decode('utf-8-sig')  # Handle BOM
    
    print(f"First 200 chars of content: {content[:200]}")  # Debug
    
    stream = io.StringIO(content, newline=None)
    reader = csv.DictReader(stream)
    
    # Check if reader has fields
    if not reader.fieldnames:
        return 0, ["CSV file is empty or has no headers"]
    
    print(f"CSV Headers found: {reader.fieldnames}")  # Debug
    
    # Create a case-insensitive mapping of headers
    header_map = {header.lower().strip(): header for header in reader.fieldnames}
    print(f"Header map (lowercase -> actual): {header_map}")  # Debug
    
    # Map expected column names to actual headers
    expected_columns = {
        'date': ['date', 'datum', 'fecha', 'data', 'day', 'jour'],
        'category': ['category', 'categoria', 'kategorie', 'cat', 'categorie', 'kategoria'],
        'amount': ['amount', 'valor', 'betrag', 'ammount', 'precio', 'price', 'montant', 'sum', 'total'],
        'description': ['description', 'desc', 'descripcion', 'beschreibung', 'note', 'notes', 'comment', 'details']
    }
    
    # Find actual column names
    column_mapping = {}
    for expected, alternatives in expected_columns.items():
        for alt in alternatives:
            if alt in header_map:
                column_mapping[expected] = header_map[alt]
                print(f"Mapped '{expected}' to column '{header_map[alt]}'")
                break
    
    print(f"Final column mapping: {column_mapping}")  # Debug
    
    # Check required columns
    missing = []
    for required in ['date', 'category', 'amount']:
        if required not in column_mapping:
            missing.append(required)
    
    if missing:
        return 0, [f"Missing required columns: {', '.join(missing)}. Found columns: {', '.join(reader.fieldnames)}"]
    
    count = 0
    errors = []
    
    for row_num, row in enumerate(reader, start=2):
        print(f"\n--- Processing row {row_num} ---")  # Debug
        print(f"Raw row data: {row}")  # Debug
        
        try:
            # Get values using mapped column names
            date_str = row[column_mapping['date']]
            category_name = row[column_mapping['category']].strip()
            amount_str = row[column_mapping['amount']]
            description = row.get(column_mapping.get('description', ''), '').strip()
            
            print(f"Extracted - Date: '{date_str}', Category: '{category_name}', Amount: '{amount_str}', Description: '{description}'")  # Debug
            
            # Skip empty rows
            if not date_str or not category_name or not amount_str:
                errors.append(f"Row {row_num}: Empty required fields")
                continue
            
            # Parse date
            try:
                date = parse_date(date_str)
            except ValueError as e:
                errors.append(f"Row {row_num}: {str(e)}")
                continue
            
            # Parse amount
            try:
                amount = parse_amount(amount_str)
            except ValueError as e:
                errors.append(f"Row {row_num}: {str(e)}")
                continue
            
            # Validate amount
            if amount <= 0:
                errors.append(f"Row {row_num}: Amount must be positive (got {amount})")
                continue
            
            # Find or create category
            cat = Category.query.filter_by(user_id=user_id, name=category_name).first()
            if not cat:
                print(f"Creating new category: {category_name}")  # Debug
                cat = Category(
                    user_id=user_id, 
                    name=category_name, 
                    is_default=False,
                    color='#3b82f6'  # Default blue color
                )
                db.session.add(cat)
                db.session.flush()  # Get the ID without committing
            
            # Create expense
            expense = Expense(
                user_id=user_id,
                category_id=cat.id,
                amount=amount,
                description=description,
                date=date
            )
            db.session.add(expense)
            count += 1
            print(f"Successfully created expense: {amount} on {date}")  # Debug
            
        except KeyError as e:
            errors.append(f"Row {row_num}: Missing column {str(e)}")
            print(f"KeyError: {e}")  # Debug
        except Exception as e:
            errors.append(f"Row {row_num}: Unexpected error - {str(e)}")
            print(f"Unexpected error: {e}")  # Debug
    
    try:
        db.session.commit()
        print(f"Successfully committed {count} expenses to database")  # Debug
    except Exception as e:
        db.session.rollback()
        print(f"Database commit error: {e}")  # Debug
        return 0, [f"Database error: {str(e)}"]
    
    return count, errors

def import_from_excel(file_stream, user_id):
    """
    Parse Excel file and create expenses for the user.
    Returns tuple (imported_count, errors_list).
    """
    count = 0
    errors = []
    
    try:
        # Reset file pointer
        file_stream.seek(0)
        
        # Read Excel file
        print(f"Reading Excel file for user {user_id}")  # Debug
        
        # Try different engines
        try:
            df = pd.read_excel(file_stream, engine='openpyxl')
        except:
            file_stream.seek(0)
            df = pd.read_excel(file_stream, engine='xlrd')
        
        print(f"Excel file loaded. Shape: {df.shape}")  # Debug
        print(f"Columns found: {list(df.columns)}")  # Debug
        
        if df.empty:
            return 0, ["Excel file is empty"]
        
        # Create a case-insensitive mapping of columns
        df.columns = [str(col).strip().lower() for col in df.columns]
        print(f"Normalized columns: {list(df.columns)}")  # Debug
        
        # Map expected column names
        expected_columns = {
            'date': ['date', 'datum', 'fecha', 'data', 'day', 'jour'],
            'category': ['category', 'categoria', 'kategorie', 'cat', 'categorie', 'kategoria'],
            'amount': ['amount', 'valor', 'betrag', 'ammount', 'precio', 'price', 'montant', 'sum', 'total'],
            'description': ['description', 'desc', 'descripcion', 'beschreibung', 'note', 'notes', 'comment', 'details']
        }
        
        # Find actual column names
        column_mapping = {}
        for expected, alternatives in expected_columns.items():
            for alt in alternatives:
                if alt in df.columns:
                    column_mapping[expected] = alt
                    print(f"Mapped '{expected}' to column '{alt}'")
                    break
        
        print(f"Final column mapping: {column_mapping}")  # Debug
        
        # Check required columns
        missing = []
        for required in ['date', 'category', 'amount']:
            if required not in column_mapping:
                missing.append(required)
        
        if missing:
            return 0, [f"Missing required columns: {', '.join(missing)}. Found columns: {', '.join(df.columns)}"]
        
        # Process each row
        for idx, row in df.iterrows():
            row_num = idx + 2  # +2 because Excel rows start at 1, and we have header
            print(f"\n--- Processing Excel row {row_num} ---")  # Debug
            
            try:
                # Get values
                date_val = row[column_mapping['date']]
                category_name = str(row[column_mapping['category']]).strip()
                amount_val = row[column_mapping['amount']]
                description = str(row.get(column_mapping.get('description', ''), '')).strip()
                
                print(f"Extracted - Date: {date_val}, Category: '{category_name}', Amount: {amount_val}, Description: '{description}'")  # Debug
                
                # Skip empty rows
                if pd.isna(date_val) or pd.isna(category_name) or pd.isna(amount_val) or category_name == 'nan' or category_name == '':
                    errors.append(f"Row {row_num}: Empty required fields")
                    continue
                
                # Parse date
                try:
                    date = parse_date(date_val)
                except ValueError as e:
                    errors.append(f"Row {row_num}: {str(e)}")
                    continue
                
                # Parse amount
                try:
                    amount = parse_amount(amount_val)
                except ValueError as e:
                    errors.append(f"Row {row_num}: {str(e)}")
                    continue
                
                # Validate amount
                if amount <= 0:
                    errors.append(f"Row {row_num}: Amount must be positive (got {amount})")
                    continue
                
                # Find or create category
                cat = Category.query.filter_by(user_id=user_id, name=category_name).first()
                if not cat:
                    print(f"Creating new category: {category_name}")  # Debug
                    cat = Category(
                        user_id=user_id, 
                        name=category_name, 
                        is_default=False,
                        color='#3b82f6'
                    )
                    db.session.add(cat)
                    db.session.flush()
                
                # Create expense
                expense = Expense(
                    user_id=user_id,
                    category_id=cat.id,
                    amount=amount,
                    description=description,
                    date=date
                )
                db.session.add(expense)
                count += 1
                print(f"Successfully created expense: {amount} on {date}")  # Debug
                
            except Exception as e:
                errors.append(f"Row {row_num}: Unexpected error - {str(e)}")
                print(f"Unexpected error: {e}")  # Debug
        
        db.session.commit()
        print(f"Successfully committed {count} expenses from Excel")  # Debug
        
    except Exception as e:
        db.session.rollback()
        print(f"Excel import failed: {e}")  # Debug
        import traceback
        traceback.print_exc()
        return 0, [f"Excel import failed: {str(e)}"]
    
    return count, errors