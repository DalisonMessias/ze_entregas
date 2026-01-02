
import re
import os

file_path = 'supabase/migrations/supabase_global.sql'
temp_file_path = 'supabase/migrations/supabase_global.sql.tmp'

with open(file_path, 'r', encoding='utf-8') as f:
    file_content = f.read()

modified_content = []
policies_processed = set() # Para evitar processar a mesma política duas vezes
lines = file_content.splitlines()

i = 0
while i < len(lines):
    line = lines[i]
    
    # Check for DROP POLICY and keep it as is
    drop_policy_match = re.match(r'DROP POLICY IF EXISTS "([^"]+)" ON (.*?);', line)
    if drop_policy_match:
        modified_content.append(line)
        i += 1
        continue

    # Regex to find CREATE POLICY, capturing policy name, table name, and the full statement
    # This pattern is more robust to different structures of CREATE POLICY statements
    # It also handles storage.objects table names correctly
    create_policy_match = re.match(r'(CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?([a-zA-Z0-9_.]+)(.*?;))', line, re.DOTALL | re.IGNORECASE)
    
    if create_policy_match:
        full_create_policy_statement = create_policy_match.group(1).strip()
        policy_name = create_policy_match.group(2)
        table_name = create_policy_match.group(3)
        
        # Capture the rest of the policy definition, potentially spanning multiple lines
        j = i + 1
        while j < len(lines) and not re.match(r'^\s*(DROP|CREATE)\s+(POLICY|TABLE|INDEX|TRIGGER|FUNCTION|VIEW|EXTENSION|TYPE|GRANT|INSERT|ALTER)', lines[j], re.IGNORECASE) and not lines[j].strip() == 'ALTER TABLE public.' + table_name + ' ENABLE ROW LEVEL SECURITY;':
            full_create_policy_statement += '\n' + lines[j]
            j += 1
        
        # Clean up any trailing semicolons or whitespace from the captured statement
        full_create_policy_statement = full_create_policy_statement.strip()
        if not full_create_policy_statement.endswith(';'):
            full_create_policy_statement += ';'

        # Ensure the policy is not already wrapped (e.g., from a previous run or manual edit)
        # This is a simplified check, assuming 'DO $$' will be on its own line before the policy
        start_of_policy_block = '\n'.join(modified_content[-5:]) # Look back a few lines
        if f"IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '{policy_name}'" in start_of_policy_block:
            print(f"Skipping already wrapped policy: {policy_name} on {table_name}")
            modified_content.append(full_create_policy_statement) # Add the original policy to modified content
            i = j
            continue

        if (policy_name, table_name) in policies_processed:
            print(f"Skipping duplicate processing for policy: {policy_name} on {table_name}")
            modified_content.append(full_create_policy_statement) # Add the original policy to modified content
            i = j
            continue
        
        policies_processed.add((policy_name, table_name))

        print(f"Wrapping policy: \"{policy_name}\" on table: \"{table_name}\" ")

        idempotent_block = f'''DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '{policy_name}' AND tablename = '{table_name}') THEN
        {full_create_policy_statement}
    END IF;
END $$;'''
        modified_content.append(idempotent_block)
        i = j # Move index past the full CREATE POLICY statement
    else:
        modified_content.append(line)
        i += 1

final_content = '\n'.join(modified_content)

with open(temp_file_path, 'w', encoding='utf-8') as f:
    f.write(final_content)

# Replace the original file with the temporary one
os.replace(temp_file_path, file_path)

print("All CREATE POLICY statements have been made idempotent in supabase/migrations/supabase_global.sql")
