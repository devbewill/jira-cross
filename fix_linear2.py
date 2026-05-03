import os

REPLACEMENTS = {
    "bg-linear-done": "bg-emerald-500",
    "text-linear-done": "text-emerald-500",
    "border-linear-done": "border-emerald-500",
    "outline-linear-done": "outline-emerald-500",

    "bg-linear-inProgress": "bg-amber-500",
    "text-linear-inProgress": "text-amber-500",
    "border-linear-inProgress": "border-amber-500",
    "outline-linear-inProgress": "outline-amber-500",

    "bg-linear-todo": "bg-slate-400",
    "text-linear-todo": "text-slate-400",
    "border-linear-todo": "border-slate-400",

    "bg-linear-overdueSolid": "bg-red-500",
    "text-linear-overdueSolid": "text-red-500",
    "border-linear-overdueSolid": "border-red-500",
    "outline-linear-overdueSolid": "outline-red-500",

    "bg-linear-overdueLight": "bg-red-500/10",
    "text-linear-dangerDark": "text-red-700",

    "bg-linear-secondaryLight": "bg-slate-100",
    "text-linear-secondaryDark": "text-slate-600",
    "border-linear-secondary": "border-slate-300",
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
        if file.endswith(".tsx") or file.endswith(".ts"):
            process_file(os.path.join(root, file))

print("All files processed.")
