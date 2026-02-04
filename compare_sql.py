
import re
import os

def parse_sql(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract tables and columns
    tables = {}
    
    # Simple regex to find CREATE TABLE blocks
    # Note: This is a simplified parser for this specific schema format
    table_blocks = re.findall(r'CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)\s*\((.*?)\);', content, re.DOTALL)
    
    for table_name, block in table_blocks:
        columns = []
        # Find column names: usually at start of line or after a comma, followed by type
        # In this schema format, columns are like: "  col_name type ..."
        for line in block.split('\n'):
            line = line.strip()
            if not line or line.startswith('CONSTRAINT') or line.startswith('PRIMARY KEY') or line.startswith('FOREIGN KEY'):
                continue
            # Match first word as column name
            match = re.match(r'^(\w+)', line)
            if match:
                columns.append(match.group(1))
        tables[table_name] = set(columns)
    
    # Also check for ALTER TABLE ... ADD COLUMN in backup
    alter_blocks = re.findall(r"ALTER TABLE public\.(\w+) ADD COLUMN (?:IF NOT EXISTS )?(\w+)", content, re.IGNORECASE)
    for table_name, col_name in alter_blocks:
        if table_name in tables:
            tables[table_name].add(col_name)
        else:
            tables[table_name] = {col_name}

    return tables

def main():
    path_global = r'supabase\migrations\supabase_global.sql'
    path_backup = r'supabase\migrations\supabase_global-backup.sql'
    
    if not os.path.exists(path_global) or not os.path.exists(path_backup):
        print("Files not found.")
        return

    tables_global = parse_sql(path_global)
    tables_backup = parse_sql(path_backup)

    print("--- DIFERENÇAS ENCONTRADAS ---")
    
    missing_tables = []
    missing_columns = {}

    for table, cols in tables_global.items():
        if table not in tables_backup:
            missing_tables.append(table)
        else:
            diff_cols = cols - tables_backup[table]
            if diff_cols:
                missing_columns[table] = diff_cols

    if missing_tables:
        print("\nTabelas ausentes no backup:")
        for t in sorted(missing_tables):
            print(f"- {t}")
    else:
        print("\nNenhuma tabela ausente.")

    if missing_columns:
        print("\nColunas ausentes em tabelas existentes no backup:")
        for t, cols in sorted(missing_columns.items()):
            print(f"- Tabela '{t}': {', '.join(sorted(cols))}")
    else:
        print("\nNenhuma coluna ausente em tabelas existentes.")

if __name__ == "__main__":
    main()
