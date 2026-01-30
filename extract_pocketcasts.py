#!/usr/bin/env python3
"""
Extract Pocket Casts listening history from iOS database export and convert to JSON.
"""

import json
import sqlite3
import zipfile
import argparse
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional


def extract_database(zip_path: str, extract_dir: str = "/tmp/pocketcasts_extract") -> Optional[str]:
    """Extract the Pocket Casts database from ZIP file."""
    os.makedirs(extract_dir, exist_ok=True)
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        
        # Look for SQLite database files
        db_files = list(Path(extract_dir).rglob("*.db")) + list(Path(extract_dir).rglob("*.sqlite"))
        
        if not db_files:
            print("No database files found in ZIP. Looking for other files...")
            all_files = list(Path(extract_dir).rglob("*"))
            print(f"Found files: {[str(f) for f in all_files]}")
            return None
        
        # Return the first database file found
        return str(db_files[0])
    
    except Exception as e:
        print(f"Error extracting ZIP: {e}")
        return None


def get_listening_history(db_path: str) -> List[Dict[str, Any]]:
    """Extract listening history from Pocket Casts database."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    history = []
    
    try:
        # Get table names to understand the schema
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Found tables: {tables}")
        
        # Common Pocket Casts table names for history
        # Try different possible table names
        possible_tables = [
            'episodes',
            'episode_history',
            'history',
            'listening_history',
            'played_episodes',
            'user_episode',
            'userEpisode'
        ]
        
        history_table = None
        for table in possible_tables:
            if table in tables:
                history_table = table
                break
        
        if not history_table:
            print("Could not find history table. Available tables:")
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"  {table}: {count} rows")
            
            # Try to find a table with episode-related data
            for table in tables:
                cursor.execute(f"PRAGMA table_info({table})")
                columns = [row[1] for row in cursor.fetchall()]
                if any(col.lower() in ['episode', 'podcast', 'played', 'listened'] for col in columns):
                    print(f"\nFound potential table: {table}")
                    print(f"  Columns: {columns}")
                    history_table = table
                    break
        
        if not history_table:
            raise ValueError("Could not identify history table")
        
        # Get column info
        cursor.execute(f"PRAGMA table_info({history_table})")
        columns = {row[1]: row[2] for row in cursor.fetchall()}
        print(f"\nUsing table: {history_table}")
        print(f"Columns: {list(columns.keys())}")
        
        # Try to get episode data - common column names
        # We'll try to get all columns and let the user see what's available
        cursor.execute(f"SELECT * FROM {history_table} LIMIT 1")
        sample_row = cursor.fetchone()
        
        if sample_row:
            column_names = [description[0] for description in cursor.description]
            print(f"\nSample row columns: {column_names}")
        
        # Fetch all history records
        cursor.execute(f"SELECT * FROM {history_table}")
        rows = cursor.fetchall()
        
        for row in rows:
            record = {}
            for idx, col_name in enumerate(cursor.description):
                value = row[idx]
                # Convert datetime strings if present
                if isinstance(value, str) and ('date' in col_name[0].lower() or 'time' in col_name[0].lower()):
                    try:
                        # Try to parse as timestamp
                        if value.isdigit():
                            value = datetime.fromtimestamp(int(value) / 1000).isoformat()
                    except:
                        pass
                record[col_name[0]] = value
            history.append(record)
        
        print(f"\nExtracted {len(history)} history records")
        
    except Exception as e:
        print(f"Error reading database: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        conn.close()
    
    return history


def get_podcast_info(db_path: str) -> Dict[str, Dict[str, Any]]:
    """Get podcast information to enrich history records."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    podcasts = {}
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        # Common podcast table names
        possible_tables = ['podcasts', 'podcast', 'feeds']
        
        podcast_table = None
        for table in possible_tables:
            if table in tables:
                podcast_table = table
                break
        
        if podcast_table:
            cursor.execute(f"SELECT * FROM {podcast_table}")
            for row in cursor.fetchall():
                record = {}
                for idx, col_name in enumerate(cursor.description):
                    record[col_name[0]] = row[idx]
                # Use UUID or ID as key
                key = record.get('uuid') or record.get('id') or record.get('_id')
                if key:
                    podcasts[str(key)] = record
    
    except Exception as e:
        print(f"Note: Could not load podcast info: {e}")
    
    finally:
        conn.close()
    
    return podcasts


def save_to_json(data: List[Dict[str, Any]], output_path: str):
    """Save data to JSON file."""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    print(f"Saved {len(data)} records to {output_path}")


def save_to_sqlite(data: List[Dict[str, Any]], db_path: str):
    """Save data to SQLite database for longer term storage."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    if not data:
        print("No data to save")
        return
    
    # Create table based on first record's keys
    sample_keys = list(data[0].keys())
    columns = ', '.join([f"{key} TEXT" for key in sample_keys])
    
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS listening_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            {columns}
        )
    """)
    
    # Insert data
    for record in data:
        keys = list(record.keys())
        values = [str(record.get(k, '')) for k in keys]
        placeholders = ', '.join(['?' for _ in keys])
        cursor.execute(f"""
            INSERT INTO listening_history ({', '.join(keys)})
            VALUES ({placeholders})
        """, values)
    
    conn.commit()
    conn.close()
    print(f"Saved {len(data)} records to SQLite database: {db_path}")


def main():
    parser = argparse.ArgumentParser(
        description='Extract Pocket Casts listening history from iOS database export'
    )
    parser.add_argument(
        'zip_path',
        help='Path to Pocket Casts exported ZIP file'
    )
    parser.add_argument(
        '--json',
        help='Output JSON file path (default: pocketcasts_history.json)',
        default='pocketcasts_history.json'
    )
    parser.add_argument(
        '--sqlite',
        help='Output SQLite database path (optional)',
        default=None
    )
    parser.add_argument(
        '--db-path',
        help='Direct path to SQLite database (skip ZIP extraction)',
        default=None
    )
    
    args = parser.parse_args()
    
    # Get database path
    if args.db_path:
        db_path = args.db_path
    else:
        print(f"Extracting database from {args.zip_path}...")
        db_path = extract_database(args.zip_path)
        if not db_path:
            print("Failed to extract database")
            return
    
    print(f"Reading database from {db_path}...")
    
    # Extract history
    history = get_listening_history(db_path)
    
    if not history:
        print("No history found")
        return
    
    # Save to JSON
    save_to_json(history, args.json)
    
    # Save to SQLite if requested
    if args.sqlite:
        save_to_sqlite(history, args.sqlite)


if __name__ == '__main__':
    main()
