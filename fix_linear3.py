import os

REPLACEMENTS = {
    "border-linear-accentHover": "border-primary",
    "border-linear-accent": "border-primary",
    "bg-linear-text": "bg-foreground",
    "--color-linear-borderHover": "--border",
    "--color-linear-border": "--border",
    "bg-linear-secondary": "bg-slate-50",
    "border-linear-danger": "border-red-500",
    "text-linear-danger": "text-red-500",
    "bg-linear-danger/10": "bg-red-500/10",
    "bg-linear-danger": "bg-red-500",
    "text-linear-bg": "text-background",
    "shadow-linear-sm": "shadow-sm",
    "shadow-linear-hover": "shadow-md",
    "shadow-linear-xs": "shadow-sm",
    "bg-linear-border": "bg-border",
    "text-linear-secondary": "text-slate-500",
}

def process_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()
    
    new_content = content
    for old, new in REPLACEMENTS.items():
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, "w") as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk("/Users/stefano.perelli/code/jira-cross/src"):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts") or file.endswith(".css"):
            process_file(os.path.join(root, file))

print("All files processed.")
