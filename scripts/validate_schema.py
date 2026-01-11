#!/usr/bin/env python3
"""
Validate schema.json against a PostgreSQL container.

This script:
1. Starts a PostgreSQL container (if not running)
2. Applies the generated schema migration
3. Applies the generated seeds
4. Validates all tables exist with correct columns
5. Validates all seed data was inserted
6. Reports any discrepancies

Usage:
  python scripts/validate_schema.py              # Run full validation
  python scripts/validate_schema.py --no-docker  # Use existing DB (requires DATABASE_URL)
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SCHEMA_FILE = REPO_ROOT / 'schema.json'
SCHEMA_SQL = REPO_ROOT / 'app/backend/migrations/0001_schema.sql'
SEEDS_SQL = REPO_ROOT / 'app/backend/migrations/0002_seeds.sql'

# Docker settings
CONTAINER_NAME = 'passion-schema-test'
PG_PORT = 5433  # Use different port to avoid conflicts
PG_USER = 'postgres'
PG_PASSWORD = 'postgres'
PG_DB = 'passion_test'

def run_cmd(cmd: list[str], capture=True, check=True) -> subprocess.CompletedProcess:
    """Run a command and return result"""
    return subprocess.run(cmd, capture_output=capture, text=True, check=check)

def docker_is_running() -> bool:
    """Check if Docker daemon is running"""
    try:
        run_cmd(['docker', 'info'], check=True)
        return True
    except:
        return False

def start_postgres_container() -> bool:
    """Start a PostgreSQL container for testing"""
    print("  Starting PostgreSQL container...")
    
    # Check if container already exists
    result = run_cmd(['docker', 'ps', '-a', '--filter', f'name={CONTAINER_NAME}', '--format', '{{.Names}}'], check=False)
    if CONTAINER_NAME in result.stdout:
        # Container exists, check if running
        result = run_cmd(['docker', 'ps', '--filter', f'name={CONTAINER_NAME}', '--format', '{{.Names}}'], check=False)
        if CONTAINER_NAME in result.stdout:
            print("  Container already running")
            return True
        # Start existing container
        run_cmd(['docker', 'start', CONTAINER_NAME], check=True)
    else:
        # Create new container
        run_cmd([
            'docker', 'run', '-d',
            '--name', CONTAINER_NAME,
            '-e', f'POSTGRES_USER={PG_USER}',
            '-e', f'POSTGRES_PASSWORD={PG_PASSWORD}',
            '-e', f'POSTGRES_DB={PG_DB}',
            '-p', f'{PG_PORT}:5432',
            'postgres:16-alpine'
        ], check=True)
    
    # Wait for PostgreSQL to be ready
    print("  Waiting for PostgreSQL to be ready...")
    for i in range(30):
        result = run_cmd([
            'docker', 'exec', CONTAINER_NAME,
            'pg_isready', '-U', PG_USER
        ], check=False)
        if result.returncode == 0:
            print("  PostgreSQL is ready")
            return True
        time.sleep(1)
    
    print("  ❌ PostgreSQL failed to start")
    return False

def stop_postgres_container():
    """Stop and remove the test container"""
    print("  Stopping container...")
    run_cmd(['docker', 'stop', CONTAINER_NAME], check=False)
    run_cmd(['docker', 'rm', CONTAINER_NAME], check=False)

def run_sql_file(sql_file: Path) -> tuple[bool, str]:
    """Run a SQL file against the test database"""
    sql_content = sql_file.read_text()
    result = subprocess.run(
        ['docker', 'exec', '-i', CONTAINER_NAME, 'psql', '-U', PG_USER, '-d', PG_DB, '-v', 'ON_ERROR_STOP=1'],
        input=sql_content,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        return False, result.stderr
    return True, result.stdout

def run_sql(sql: str) -> tuple[bool, str]:
    """Run a SQL command and return result"""
    result = subprocess.run(
        ['docker', 'exec', '-i', CONTAINER_NAME, 'psql', '-U', PG_USER, '-d', PG_DB, '-t', '-A'],
        input=sql,
        capture_output=True,
        text=True
    )
    return result.returncode == 0, result.stdout.strip()

def get_db_tables() -> set[str]:
    """Get list of tables in the database"""
    sql = """
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
    """
    success, output = run_sql(sql)
    if not success:
        return set()
    return set(line.strip() for line in output.split('\n') if line.strip())

def get_table_columns(table_name: str) -> dict[str, dict]:
    """Get column info for a table"""
    sql = f"""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '{table_name}'
    ORDER BY ordinal_position;
    """
    success, output = run_sql(sql)
    if not success:
        return {}
    
    columns = {}
    for line in output.split('\n'):
        if '|' in line:
            parts = line.split('|')
            columns[parts[0]] = {
                'type': parts[1],
                'nullable': parts[2] == 'YES'
            }
    return columns

def count_table_rows(table_name: str) -> int:
    """Get row count for a table"""
    success, output = run_sql(f"SELECT COUNT(*) FROM {table_name};")
    if success and output.isdigit():
        return int(output)
    return 0

def validate_schema(schema: dict) -> list[str]:
    """Validate database matches schema.json"""
    errors = []
    
    # Get actual tables from database
    db_tables = get_db_tables()
    schema_tables = set(schema['tables'].keys())
    
    # Add schema_version to expected tables (it's created by migration)
    schema_tables.add('schema_version')
    
    # Check for missing tables
    missing = schema_tables - db_tables
    if missing:
        for t in sorted(missing):
            errors.append(f"Missing table: {t}")
    
    # Check for extra tables
    extra = db_tables - schema_tables
    if extra:
        for t in sorted(extra):
            errors.append(f"Extra table in DB: {t}")
    
    # Validate columns for each table
    for table_name, table_def in schema['tables'].items():
        if table_name not in db_tables:
            continue
        
        db_cols = get_table_columns(table_name)
        schema_cols = table_def['fields']
        
        for col_name, col_def in schema_cols.items():
            if col_name not in db_cols:
                errors.append(f"{table_name}.{col_name}: column missing in DB")
            else:
                # Check nullability
                expected_nullable = col_def.get('nullable', False)
                actual_nullable = db_cols[col_name]['nullable']
                if expected_nullable != actual_nullable:
                    errors.append(f"{table_name}.{col_name}: nullable mismatch (expected={expected_nullable}, actual={actual_nullable})")
    
    return errors

def validate_seeds(schema: dict) -> list[str]:
    """Validate seed data was inserted correctly"""
    errors = []
    seeds = schema.get('seeds', {})
    
    for table_name, seed_def in seeds.items():
        expected_count = len(seed_def.get('records', []))
        actual_count = count_table_rows(table_name)
        
        if actual_count < expected_count:
            errors.append(f"{table_name}: expected {expected_count} seed records, found {actual_count}")
    
    return errors

def main():
    parser = argparse.ArgumentParser(description='Validate schema against PostgreSQL')
    parser.add_argument('--no-docker', action='store_true', help='Skip Docker, use DATABASE_URL')
    parser.add_argument('--keep', action='store_true', help='Keep container running after test')
    args = parser.parse_args()
    
    print("=" * 60)
    print("SCHEMA VALIDATION")
    print("=" * 60)
    
    # Load schema
    if not SCHEMA_FILE.exists():
        print(f"❌ Schema file not found: {SCHEMA_FILE}")
        sys.exit(1)
    
    with open(SCHEMA_FILE) as f:
        schema = json.load(f)
    
    print(f"\n📋 Schema version: {schema['version']}")
    print(f"   Tables: {len(schema['tables'])}")
    print(f"   Seeds: {sum(len(s.get('records', [])) for s in schema.get('seeds', {}).values())} records")
    
    # Check generated files exist
    if not SCHEMA_SQL.exists():
        print(f"\n❌ Schema migration not found: {SCHEMA_SQL}")
        print("   Run: python generate_all.py")
        sys.exit(1)
    
    if not SEEDS_SQL.exists():
        print(f"\n❌ Seeds migration not found: {SEEDS_SQL}")
        print("   Run: python generate_all.py")
        sys.exit(1)
    
    # Start PostgreSQL
    print("\n🐘 PostgreSQL Setup")
    if not args.no_docker:
        if not docker_is_running():
            print("  ❌ Docker is not running")
            sys.exit(1)
        
        if not start_postgres_container():
            sys.exit(1)
    
    # Reset database
    print("\n🔄 Resetting database...")
    run_sql("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    
    # Apply schema
    print("\n📦 Applying schema migration...")
    success, output = run_sql_file(SCHEMA_SQL)
    if not success:
        print(f"  ❌ Failed to apply schema: {output}")
        if not args.keep:
            stop_postgres_container()
        sys.exit(1)
    print("  ✓ Schema applied")
    
    # Apply seeds
    print("\n🌱 Applying seed data...")
    success, output = run_sql_file(SEEDS_SQL)
    if not success:
        print(f"  ❌ Failed to apply seeds: {output}")
        if not args.keep:
            stop_postgres_container()
        sys.exit(1)
    print("  ✓ Seeds applied")
    
    # Validate schema
    print("\n🔍 Validating schema...")
    schema_errors = validate_schema(schema)
    if schema_errors:
        print(f"  ❌ {len(schema_errors)} schema errors:")
        for err in schema_errors:
            print(f"     - {err}")
    else:
        print("  ✓ Schema valid")
    
    # Validate seeds
    print("\n🔍 Validating seeds...")
    seed_errors = validate_seeds(schema)
    if seed_errors:
        print(f"  ❌ {len(seed_errors)} seed errors:")
        for err in seed_errors:
            print(f"     - {err}")
    else:
        print("  ✓ Seeds valid")
    
    # Summary
    print("\n" + "=" * 60)
    total_errors = len(schema_errors) + len(seed_errors)
    if total_errors == 0:
        print("✅ ALL VALIDATIONS PASSED")
    else:
        print(f"❌ VALIDATION FAILED ({total_errors} errors)")
    print("=" * 60)
    
    # Cleanup
    if not args.keep and not args.no_docker:
        print("\n🧹 Cleaning up...")
        stop_postgres_container()
    elif args.keep:
        print(f"\n💡 Container '{CONTAINER_NAME}' still running on port {PG_PORT}")
    
    sys.exit(0 if total_errors == 0 else 1)

if __name__ == '__main__':
    main()
