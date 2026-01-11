#!/usr/bin/env python3
"""Generate Rust, TypeScript, and SQL from schema.json"""
import json

with open('schema.json') as f:
    schema = json.load(f)

# Rust reserved keywords that need r# prefix
RUST_KEYWORDS = {'type', 'match', 'use', 'ref', 'self', 'super', 'crate', 'mod', 'move', 'mut', 'pub', 'static', 'trait', 'where', 'async', 'await', 'dyn'}

def rust_field_name(name: str) -> str:
    """Escape Rust reserved keywords"""
    if name in RUST_KEYWORDS:
        return f"r#{name}"
    return name

# RUST GENERATION
rust_lines = [
    "// GENERATED FROM schema.json - DO NOT EDIT",
    "#![allow(dead_code)]",
    "use chrono::{DateTime, NaiveDate, Utc};",
    "use serde::{Deserialize, Serialize};",
    "use sqlx::FromRow;",
    "use uuid::Uuid;",
    ""
]

for table_name, table_def in sorted(schema['tables'].items()):
    rust_lines.append(f"#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]")
    rust_lines.append(f"pub struct {table_def['rust_type']} {{")
    for field_name, field_def in table_def['fields'].items():
        rust_type = schema['type_mappings'][field_def['type']]['rust']
        if field_def.get('nullable'):
            rust_type = f"Option<{rust_type}>"
        rust_field = rust_field_name(field_name)
        rust_lines.append(f"    pub {rust_field}: {rust_type},")
    rust_lines.append("}\n")

with open('generated_models.rs', 'w') as f:
    f.write('\n'.join(rust_lines))

# TYPESCRIPT GENERATION
ts_lines = ["// GENERATED FROM schema.json - DO NOT EDIT", ""]

for table_name, table_def in sorted(schema['tables'].items()):
    ts_lines.append(f"export interface {table_def['ts_type']} {{")
    for field_name, field_def in table_def['fields'].items():
        ts_type = schema['type_mappings'][field_def['type']]['typescript']
        optional = '?' if field_def.get('nullable') else ''
        ts_lines.append(f"  {field_name}{optional}: {ts_type};")
    ts_lines.append("}\n")

with open('generated_types.ts', 'w') as f:
    f.write('\n'.join(ts_lines))

# SQL GENERATION
sql_lines = ["-- GENERATED FROM schema.json - DO NOT EDIT", ""]

for table_name, table_def in sorted(schema['tables'].items()):
    sql_lines.append(f"CREATE TABLE {table_name} (")
    cols = []
    for field_name, field_def in table_def['fields'].items():
        pg_type = schema['type_mappings'][field_def['type']]['postgres']
        constraints = []
        if field_def.get('primary'):
            constraints.append('PRIMARY KEY')
        if not field_def.get('nullable') and not field_def.get('primary'):
            constraints.append('NOT NULL')
        col_line = f"    {field_name} {pg_type}"
        if constraints:
            col_line += ' ' + ' '.join(constraints)
        cols.append(col_line)
    sql_lines.append(',\n'.join(cols))
    sql_lines.append(");\n")

with open('generated_schema.sql', 'w') as f:
    f.write('\n'.join(sql_lines))

print(f"✓ Generated code for {len(schema['tables'])} tables:")
print(f"  • generated_models.rs     - {len(schema['tables'])} Rust structs")
print(f"  • generated_types.ts      - {len(schema['tables'])} TypeScript interfaces")
print(f"  • generated_schema.sql    - {len(schema['tables'])} SQL CREATE statements")
