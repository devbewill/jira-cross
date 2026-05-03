import re

with open("/Users/stefano.perelli/code/jira-cross/src/components/sprint/SprintDashboard.tsx", "r") as f:
    content = f.read()

content = re.sub(
    r"<Button variant='outline' size='sm' onClick=\{\(\) => refetch\(\)\}>.*?</Button>",
    r"<button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3' onClick={() => refetch()}>Riprova</button>",
    content,
    flags=re.DOTALL
)

content = re.sub(
    r"<Button\n\s*variant='outline'\n\s*size='sm'\n\s*disabled=\{loading\}\n\s*onClick=\{triggerRefresh\}\n\s*>\n\s*<RefreshCw\n\s*className=\{`mr-2 h-3.5 w-3.5 \$\{loading \? 'animate-spin' : ''\}`\}\n\s*\/>\n\s*Ricarica\n\s*</Button>",
    r"<button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3' disabled={loading || isRefreshing} onClick={triggerRefresh}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading || isRefreshing ? 'animate-spin' : ''}`} />Ricarica</button>",
    content,
    flags=re.DOTALL
)

with open("/Users/stefano.perelli/code/jira-cross/src/components/sprint/SprintDashboard.tsx", "w") as f:
    f.write(content)

print("Fixed Button")
