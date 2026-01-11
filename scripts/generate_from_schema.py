#!/usr/bin/env python3
"""
Schema Code Generator
Generates Rust models and TypeScript types from schema.json
"""
import json
from pathlib import Path

def load_schema():
    with open('schema.json') as f:
        return json.load(f)

def generate_rust_model(table_name, table_def, type_mappings):
    """Generate Rust struct from schema"""
    struct_name = table_def['rust_type']
    fields = []
    
    for field_name, field_def in table_def['fields'].items():
        rust_type = field_def.get('rust_type') or type_mappings[field_def['type']]['rust']
        if field_def.get('nullable'):
            rust_type = f"Option<{rust_type}>"
        fields.append(f"    pub {field_name}: {rust_type},")
    
    return f"""
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct {struct_name} {{
{chr(10).join(fields)}
}}
"""

def generate_typescript_interface(table_name, table_def, type_mappings):
    """Generate TypeScript interface from schema"""
    interface_name = table_def['ts_type']
    fields = []
    
    for field_name, field_def in table_def['fields'].items():
        ts_type = type_mappings[field_def['type']]['typescript']
        optional = '?' if field_def.get('nullable') else ''
        fields.append(f"  {field_name}{optional}: {ts_type};")
    
    return f"""
export interface {interface_name} {{
{chr(10).join(fields)}
}}
"""

def generate_sql_migration(table_name, table_def, type_mappings):
    """Generate SQL CREATE TABLE from schema"""
    columns = []
    
    for field_name, field_def in table_def['fields'].items():
        pg_type = type_mappings[field_def['type']]['postgres']
        constraints = []
        
        if field_def.get('primary'):
            constraints.append('PRIMARY KEY')
        if field_def.get('unique'):
            constraints.append('UNIQUE')
        if not field_def.get('nullable') and not field_def.get('primary'):
            constraints.append('NOT NULL')
        if 'default' in field_def:
            default_val = field_def['default']
            if isinstance(default_val, bool):
                default_val = str(default_val).lower()
            elif isinstance(default_val, str):
                default_val = f"'{default_val}'"
            constraints.append(f'DEFAULT {default_val}')
        
        column_line = f"    {field_name} {pg_type}"
        if constraints:
            column_line += ' ' + ' '.join(constraints)
        columns.append(column_line)
    
    return f"""
CREATE TABLE {table_name} (
{','.join([chr(10) + col for col in columns])}
);
"""

def main():
    schema = load_schema()
    
    print("=" * 60)
    print("GENERATING CODE FROM SCHEMA")
    print("=" * 60)
    
    # Generate Rust models
    print("\n### RUST MODELS ###\n")
    for table_name, table_def in schema['tables'].items():
        print(generate_rust_model(table_name, table_def, schema['type_mappings']))
    
    # Generate TypeScript interfaces
    print("\n### TYPESCRIPT INTERFACES ###\n")
    for table_name, table_def in schema['tables'].items():
        print(generate_typescript_interface(table_name, table_def, schema['type_mappings']))
    
    # Generate SQL
    print("\n### SQL MIGRATIONS ###\n")
    for table_name, table_def in schema['tables'].items():
        print(generate_sql_migration(table_name, table_def, schema['type_mappings']))

if __name__ == '__main__':
    main()
