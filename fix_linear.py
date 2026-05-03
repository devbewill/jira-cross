import os

REPLACEMENTS = {
    "bg-linear-surfaceActive": "bg-muted",
    "bg-linear-surfaceHover": "hover:bg-muted/50 bg-transparent",
    "bg-linear-surface": "bg-card",
    "bg-linear-bg": "bg-background",
    "text-linear-textDim": "text-muted-foreground/60",
    "text-linear-textSecondary": "text-muted-foreground",
    "text-linear-text": "text-foreground",
    "border-linear-border": "border-border",
    "border-linear-divider": "border-border",
    "bg-linear-accentHover": "hover:bg-primary/90 bg-primary",
    "bg-linear-accent": "bg-primary",
    "text-linear-accent": "text-primary",
    "bg-timeline-grid": "bg-slate-50/50",
    "border-timeline-border": "border-slate-200",
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

# Walk through src directory
for root, dirs, files in os.walk("/Users/stefano.perelli/code/jira-cross/src"):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            process_file(os.path.join(root, file))

print("All files processed.")
