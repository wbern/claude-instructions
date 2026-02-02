<detect_provider>
  <check_remote_url>git remote get-url origin</check_remote_url>
  <identify_host>
    - github.com → GitHub (use `gh` CLI)
    - gitlab.com → GitLab (use `glab` CLI)
    - bitbucket.org → Bitbucket (use git commands)
    - Other → Ask user
  </identify_host>
</detect_provider>
<check_available_tools>
  <check_cli>Verify gh/glab CLI is installed and authenticated</check_cli>
  <if_not_available>Show error: "GitHub CLI not available. Run: gh auth login"</if_not_available>
</check_available_tools>
<select_tool>
  <store_as>$GIT_HOST_TOOL = "gh_cli" or "glab_cli" based on detected host</store_as>
</select_tool>
