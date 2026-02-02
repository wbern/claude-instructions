Use the GitHub CLI to fetch issue details:

```bash
gh issue view [ISSUE_NUMBER] --json title,body,labels,comments,state
```

If the `gh` CLI is not installed or authenticated, show:
```
GitHub CLI not available or not authenticated!
Run: gh auth login
```
