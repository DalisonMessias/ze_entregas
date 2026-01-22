import os
import re
import json

def scan_imports():
    all_files = []
    for root, dirs, files in os.walk('.'):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')
        if 'dist' in dirs:
            dirs.remove('dist')
        for file in files:
            all_files.append(os.path.normpath(os.path.join(root, file)).replace('\\', '/'))

    import_re = re.compile(r'import.*from\s+["\'](.*)["\']')
    problems = []

    for root, dirs, files in os.walk('.'):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')
        if 'dist' in dirs:
            dirs.remove('dist')
            
        for file in files:
            if not file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                continue
                
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                matches = import_re.findall(content)
                for m in matches:
                    if m.startswith('.'):
                        target_path = os.path.normpath(os.path.join(root, m)).replace('\\', '/')
                        # Check extensions
                        found = False
                        for ext in ['', '.tsx', '.ts', '.js', '.jsx', '.css', '.scss']:
                            test_path = target_path + ext
                            # Case sensitive check
                            for real_file in all_files:
                                if real_file.lower() == test_path.lower():
                                    if real_file != test_path:
                                        problems.append({
                                            'file': file_path,
                                            'import': m,
                                            'expected': real_file,
                                            'actual': test_path
                                        })
                                    found = True
                                    break
                            if found: break
                                        
    with open('import_problems.json', 'w') as f:
        json.dump(problems, f, indent=2)

if __name__ == "__main__":
    scan_imports()
