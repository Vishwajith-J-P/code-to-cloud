import os, glob
updated = 0
for filepath in glob.glob('templates/**/*.html', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = content.replace('${{ "%.2f"', '₹{{ "%.2f"')
    new_content = new_content.replace('Price ($)', 'Price (₹)')
    new_content = new_content.replace('Store Revenue ($)', 'Store Revenue (₹)')
    new_content = new_content.replace('border-end-0\">$</span>', 'border-end-0\">₹</span>')
    
    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        updated += 1
        print(f'Updated {filepath}')
print(f'Total {updated} files updated.')
