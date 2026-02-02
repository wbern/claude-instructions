Use the GitHub CLI to fetch PR details:

```bash
gh pr view [PR_NUMBER] --json title,body,state,mergeable,headRefName,baseRefName
gh pr diff [PR_NUMBER]
```

If the `gh` CLI is not installed or authenticated, show:
```
GitHub CLI not available or not authenticated!
Run: gh auth login
```
