
import re

def audit_file(filepath):
    print(f"Auditing file: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    pattern = r'auth\.uid\(\)'
    
    suspicious_lines = []
    
    for i, line in enumerate(lines):
        # Find all occurrences of auth.uid()
        matches = [m.start() for m in re.finditer(pattern, line)]
        
        for start_index in matches:
            # Check what comes after auth.uid()
            # Length of "auth.uid()" is 10
            end_index = start_index + 10
            
            # Get the characters immediately following the match
            # We look ahead a bit to check for ::text or ::uuid
            following_chars = line[end_index:end_index+10] # grab enough chars
            
            if "::text" in following_chars or "::uuid" in following_chars:
                continue # This one is casted, so it's likely safe (or at least explicit)
            
            # If we are here, it's NOT explicitly casted immediately.
            # It could be fine (e.g. strict UUID column), but given the errors, we want to flag it.
            suspicious_lines.append((i + 1, line.strip()))
            break # Once we flag a line, move to next line

    if not suspicious_lines:
        print("No suspicious lines found (all auth.uid() occurrences seem to be casted).")
    else:
        print(f"Found {len(suspicious_lines)} suspicious lines:")
        for ln, content in suspicious_lines:
            print(f"Line {ln}: {content}")

if __name__ == "__main__":
    audit_file('supabase/migrations/supabase_global.sql')
