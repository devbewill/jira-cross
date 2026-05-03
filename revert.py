import os

def reverse_replacements(filename, pairs):
    with open(filename, 'r') as f:
        content = f.read()
    
    for target, replacement in pairs:
        content = content.replace(target, replacement)
        
    with open(filename, 'w') as f:
        f.write(content)

pairs_sprint = [
    ("bg-linear-surface flex flex-col gap-1 rounded-2xl border border-linear-border", "bg-card flex flex-col gap-1 rounded-2xl border"),
    ("text-linear-textSecondary text-xs font-bold tracking-widest", "text-muted-foreground text-xs font-bold tracking-widest"),
    ("text-linear-textSecondary text-xs font-bold", "text-muted-foreground text-xs font-bold"),
    ("text-linear-textSecondary text-xs italic", "text-muted-foreground text-xs italic"),
    ("backgroundColor: 'var(--color-linear-done)', color: '#fff', borderColor: 'transparent'", "backgroundColor: 'rgba(16,185,129,0.10)', color: '#047857', borderColor: 'rgba(16,185,129,0.25)'"),
    ("backgroundColor: 'var(--color-linear-overdueSolid)', color: '#fff', borderColor: 'transparent'", "backgroundColor: 'rgba(192,38,211,0.08)', color: '#9D174D', borderColor: 'rgba(192,38,211,0.20)'"),
    ("backgroundColor: 'var(--color-linear-upcomingGold)', color: '#fff', borderColor: 'transparent'", "backgroundColor: 'rgba(99,102,241,0.08)', color: '#4338CA', borderColor: 'rgba(99,102,241,0.20)'"),
    ("bg-linear-surface overflow-hidden rounded-2xl border border-linear-border", "bg-card overflow-hidden rounded-2xl border"),
    ("border-linear-border border-b", "border-border border-b"),
    ("border-linear-border flex", "border-border flex"),
    ("backgroundColor: 'var(--color-linear-done)', borderColor: 'transparent', color: '#fff'", "backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.25)', color: '#047857'"),
    ("backgroundColor: 'var(--color-linear-overdueSolid)', borderColor: 'transparent', color: '#fff'", "backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.20)', color: '#DC2626'"),
    ("text-linear-text text-sm", "text-foreground text-sm"),
    ("text-linear-textSecondary mt-0.5", "text-muted-foreground mt-0.5"),
    ("border-linear-border bg-linear-surface hover:bg-linear-surfaceHover", "border-border bg-card hover:bg-muted"),
    ("text-linear-textSecondary h-3.5", "text-muted-foreground h-3.5"),
    ("text-linear-textSecondary block", "text-muted-foreground block"),
    ("text-linear-text' style={{ color: 'var(--color-linear-danger)' }}", "text-foreground' style={{ color: '#DC2626' }}"),
    ("text-linear-textSecondary mb-1.5", "text-muted-foreground mb-1.5"),
    ("border-linear-border border-b", "border-border border-b"),
    ("divide-linear-border divide-y", "divide-border divide-y"),
    ("bg-linear-surfaceHover flex items-center", "bg-muted/50 flex items-center"),
    ("text-linear-accent hover:underline", "text-violet-700 hover:underline"),
    ("text-linear-text min-w-0", "text-foreground min-w-0"),
    ("backgroundColor: 'var(--color-linear-inProgress)', color: '#fff'", "backgroundColor: 'rgba(245,158,11,0.12)', color: '#B45309'"),
    ("backgroundColor: 'var(--color-linear-todo)', color: '#000'", "backgroundColor: 'rgba(0,0,0,0.05)', color: '#6B7280'"),
    ("text-linear-textSecondary h-3.5", "text-slate-400 h-3.5"),
    ("text-linear-textSecondary text-xs", "text-muted-foreground text-xs"),
    ("bg-linear-secondary border-linear-border flex", "bg-muted/40 border-border flex"),
    ("group-hover:underline", "group-hover:underline"),
    ("text-linear-textSecondary h-3.5 w-3.5", "text-muted-foreground h-3.5 w-3.5"),
    ("color: 'var(--color-linear-danger)'", "color: '#EF4444'"),
    ("text-linear-textSecondary h-8", "text-muted-foreground h-8"),
    ("text-linear-danger text-sm", "text-destructive text-sm"),
    ("text-linear-text text-2xl", "text-2xl"),
    ("text-linear-danger", "text-red-600"),
    ("border-linear-border bg-linear-surface text-linear-text hover:bg-linear-surfaceHover", "border-input bg-background hover:bg-accent hover:text-accent-foreground"),
    ("bg-linear-surface flex flex-col", "bg-card flex flex-col"),
    ("bg-linear-secondary text-linear-text placeholder:text-linear-textSecondary", "bg-muted/50 text-foreground placeholder:text-muted-foreground/60"),
    ("focus:ring-linear-accent", "focus:ring-violet-600"),
    ("bg-linear-text text-white", "bg-foreground text-background"),
    ("text-linear-textSecondary hover:bg-linear-secondary", "text-muted-foreground hover:bg-muted"),
    ("bg-violet-50/60", "bg-violet-50/60"),
    ("border-linear-border divide-linear-border", "border-border divide-border"),
    ("text-sm font-bold text-linear-text", "text-sm font-bold"),
]

reverse_replacements('src/components/sprint/SprintDashboard.tsx', pairs_sprint)

print("SprintDashboard reversed")
