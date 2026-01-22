
file_path = r"supabase\migrations\supabase_global.sql"
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        if "pg_tables" in content:
             print("Found 'pg_tables'")
        if "information_schema.tables" in content:
             print("Found 'information_schema.tables'")
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if "pg_tables" in line or "information_schema.tables" in line:
                print(f"Line {i+1}: {line.strip()}")
except Exception as e:
    print(f"Error: {e}")
