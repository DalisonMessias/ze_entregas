
file_path = r"supabase\migrations\supabase_global.sql"
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for i, line in enumerate(lines):
            line_lower = line.lower()
            if "spatial_ref_sys" in line_lower:
                print(f"Line {i+1}: {line.strip()}")
            if "supabase_realtime" in line_lower:
                print(f"Line {i+1}: {line.strip()}")
            if "publication" in line_lower:
                print(f"Line {i+1}: {line.strip()}")
            if "realtime" in line_lower:
                print(f"Line {i+1}: {line.strip()}")
            if "enable row level security" in line_lower and "alter table" not in line_lower:
                print(f"Line {i+1} (Weird RLS): {line.strip()}")
except Exception as e:
    print(f"Error: {e}")
