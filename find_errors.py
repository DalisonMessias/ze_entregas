
file_path = r"supabase\migrations\supabase_global.sql"
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for i, line in enumerate(lines):
            if "spatial_ref_sys" in line:
                print(f"Line {i+1}: {line.strip()}")
            if "supabase_realtime" in line:
                print(f"Line {i+1}: {line.strip()}")
            if "publication" in line.lower() and "add table" in line.lower():
                 print(f"Line {i+1}: {line.strip()}")
            if "alter table" in line.lower() and "enable row level security" in line.lower():
                 # Isso é muito comum, mas se for dinâmico (EXECUTE) é interessante
                 if "execute" in line.lower():
                     print(f"Line {i+1} (Dynamic RLS?): {line.strip()}")
except Exception as e:
    print(f"Error: {e}")
