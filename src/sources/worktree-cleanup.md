---
description: Clean up merged worktrees by verifying PR/issue status, consolidating settings, and removing stale worktrees
argument-hint: (no arguments)
_hint: Cleanup worktree
_category: Worktree Management
_order: 2
---

# Worktree Cleanup

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/no-plan-files.md' featureFlag='no-plan-files' -->
<!-- /docs -->

Clean up merged worktrees by finding the oldest merged branch, consolidating settings, and removing stale worktrees.

**User arguments:**

Worktree-cleanup: $ARGUMENTS

**End of user arguments**

<current_state>
Current branch: `git branch --show-current`
Current worktrees: `git worktree list`
</current_state>

<execution_steps>
<step_0>
  <description>Detect git hosting provider and available tools</description>
<!-- docs INCLUDE path='src/fragments/git-host-detection-gh-mcp.md' featureFlag='gh-mcp' -->
<!-- /docs -->
<!-- docs INCLUDE path='src/fragments/git-host-detection-gh-cli.md' featureFlag='gh-cli' -->
<!-- /docs -->
<!-- docs INCLUDE path='src/fragments/git-host-detection.md' unlessFlags='gh-cli,gh-mcp' -->
<!-- /docs -->
  <purpose>Detect git hosting provider and select appropriate tool for PR verification</purpose>
</step_0>

  <step_1>
    <description>Determine default branch and verify we're on it</description>
    <find_default_branch>
      <command>git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'</command>
      <fallback>git remote show origin | grep 'HEAD branch' | cut -d: -f2 | tr -d ' '</fallback>
      <store_as>$DEFAULT_BRANCH (typically "main" or "master")</store_as>
    </find_default_branch>
    <check_current_branch>git branch --show-current</check_current_branch>
    <verify>Current branch must equal $DEFAULT_BRANCH</verify>
    <error_if_not_default>Exit with error: "This command must be run from the default branch ($DEFAULT_BRANCH)"</error_if_not_default>
    <purpose>Ensure we're consolidating to the default branch worktree</purpose>
  </step_1>

  <step_2>
    <description>Get list of all worktrees</description>
    <command>git worktree list --porcelain</command>
    <parse_output>Extract worktree paths and branch names</parse_output>
    <exclude_default>Filter out the default branch worktree from cleanup candidates</exclude_default>
    <purpose>Identify all worktrees that could potentially be cleaned up</purpose>
  </step_2>

  <step_3>
    <description>Find oldest worktree by directory age</description>
    <get_worktree_ages>
      <detect_platform>uname -s (returns "Darwin" for macOS, "Linux" for Linux)</detect_platform>
      <command_macos>git worktree list | grep -v "\[$DEFAULT_BRANCH\]" | awk '{print $1}' > /tmp/worktrees-$$.txt && while IFS= read -r path; do echo "$(/usr/bin/stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$path" 2>/dev/null)|$path"; done < /tmp/worktrees-$$.txt | sort; rm -f /tmp/worktrees-$$.txt</command_macos>
      <command_linux>git worktree list | grep -v "\[$DEFAULT_BRANCH\]" | awk '{print $1}' > /tmp/worktrees-$$.txt && while IFS= read -r path; do echo "$(stat -c '%y' "$path" 2>/dev/null | cut -d. -f1)|$path"; done < /tmp/worktrees-$$.txt | sort; rm -f /tmp/worktrees-$$.txt</command_linux>
      <purpose>List all worktrees sorted by directory modification time (oldest first)</purpose>
      <critical_notes>
        - Replace $DEFAULT_BRANCH with value from step_1 (e.g., "main" or "master")
        - grep "\[branch\]" matches branch name in brackets, not paths containing the word
        - Temp file approach avoids subshell parsing issues with piped while-loops
        - /usr/bin/stat on macOS avoids homebrew stat conflicts
      </critical_notes>
      <expected_output_format>YYYY-MM-DD HH:MM|/full/path/to/worktree (oldest first)</expected_output_format>
    </get_worktree_ages>
    <filter_recent>
      <exclude_new>For worktrees created within the last 24 hours, let user know that this worktree might not be worth cleaning</exclude_new>
      <get_current_time>date +"%Y-%m-%d %H:%M"</get_current_time>
    </filter_recent>
    <select_oldest>
      <extract_branch_name>Parse branch name from oldest worktree path</extract_branch_name>
      <important_note>DO NOT use "git branch --merged" to check merge status - it's unreliable</important_note>
      <proceed_to_pr_check>Move directly to step 4 to verify PR merge status instead</proceed_to_pr_check>
    </select_oldest>
    <purpose>Identify oldest worktree candidate - actual merge verification happens via PR/MR in next step</purpose>
  </step_3>

  <step_4>
    <description>Verify PR/MR merge status (primary merge verification)</description>
    <determine_repo>
      <check_remote>git remote get-url origin</check_remote>
      <parse_repo>Extract owner/repo from remote URL</parse_repo>
    </determine_repo>
    <search_pr>
      <tool>Use $GIT_HOST_TOOL from step_0 (e.g., mcp__github__search_pull_requests, mcp__gitlab__*, or gh CLI)</tool>
      <query>Find PRs/MRs where head={branch_name} and base=$DEFAULT_BRANCH</query>
      <purpose>Find PR/MR for this branch targeting default branch</purpose>
      <important>This is the PRIMARY way to verify if a branch was merged - NOT git commands</important>
    </search_pr>
    <verify_pr_merged>
      <if_pr_found>
        <get_pr_details>Use $GIT_HOST_TOOL to get full PR/MR info</get_pr_details>
        <confirm_merged>Verify PR/MR state is "closed"/"merged" AND merged_at is not null AND base is "$DEFAULT_BRANCH"</confirm_merged>
        <extract_issue_number>Look for issue references in PR title/body (e.g., #123, owner/repo#123)</extract_issue_number>
        <if_merged>Proceed with cleanup - this branch was definitively merged to default branch</if_merged>
        <if_not_merged>
          <skip_worktree>This worktree is NOT merged - continue to next oldest worktree</skip_worktree>
          <repeat_from_step_3>Go back and find the next oldest worktree to check</repeat_from_step_3>
        </if_not_merged>
      </if_pr_found>
      <if_no_pr>
        <skip_worktree>No PR found - this branch was likely never submitted for review</skip_worktree>
        <continue_to_next>Continue checking next oldest worktree</continue_to_next>
      </if_no_pr>
    </verify_pr_merged>
    <purpose>Use PR/MR status as the authoritative source for merge verification instead of unreliable git commands</purpose>
  </step_4>

  <step_4_5>
    <description>Check and close related issue</description>
    <if_issue_found>
      <get_issue_details>
        <tool>Use $GIT_HOST_TOOL to read issue details</tool>
        <extract_repo>From issue reference (main-repo vs cross-repo)</extract_repo>
      </get_issue_details>
      <check_issue_state>
        <if_open>
          <ask_close>Ask user: "Related issue #{number} is still open. Should I close it? (y/N)"</ask_close>
          <if_yes_close>
            <add_closing_comment>
              <tool>Use $GIT_HOST_TOOL to add comment</tool>
              <body_template>Closing this issue as branch {branch_name} was merged to {default_branch} on {merge_date} via PR/MR #{pr_number}.</body_template>
              <get_merge_date>Extract merge date from PR/MR details</get_merge_date>
              <get_pr_number>Use PR/MR number from search results</get_pr_number>
            </add_closing_comment>
            <close_issue>
              <tool>Use $GIT_HOST_TOOL to close issue</tool>
              <state>closed</state>
              <state_reason>completed</state_reason>
            </close_issue>
          </if_yes_close>
        </if_open>
        <if_closed>Inform user issue is already closed</if_closed>
      </check_issue_state>
    </if_issue_found>
    <if_no_issue>Continue without issue management</if_no_issue>
    <purpose>Ensure proper issue lifecycle management</purpose>
  </step_4_5>

  <step_5>
    <description>Check if worktree is locked</description>
    <check_command>git worktree list --porcelain | grep -A5 "worktree {path}" | grep "locked"</check_command>
    <if_locked>
      <unlock_command>git worktree unlock {path}</unlock_command>
      <notify_user>Inform user that worktree was unlocked</notify_user>
    </if_locked>
    <purpose>Unlock worktree if it was locked for tracking purposes</purpose>
  </step_5>

  <step_6>
    <description>Analyze Claude settings differences</description>
    <read_main_settings>.claude/settings.local.json</read_main_settings>
    <read_worktree_settings>{worktree_path}/.claude/settings.local.json</read_worktree_settings>
    <compare_allow_lists>
      <extract_main_allows>Extract "allow" array from main settings</extract_main_allows>
      <extract_worktree_allows>Extract "allow" array from worktree settings</extract_worktree_allows>
      <find_differences>Identify entries in worktree that are not in main</find_differences>
    </compare_allow_lists>
    <filter_suggestions>
      <include_filesystem>Read permissions for filesystem paths</include_filesystem>
      <exclude_intrusive>Exclude bash commands, write permissions, etc.</exclude_intrusive>
      <focus_user_specific>Include only user-specific, non-disruptive entries</focus_user_specific>
    </filter_suggestions>
    <purpose>Identify useful settings to consolidate before cleanup</purpose>
  </step_6>

  <step_7>
    <description>Suggest settings consolidation</description>
    <if_differences_found>
      <display_suggestions>Show filtered differences to user</display_suggestions>
      <ask_confirmation>Ask user which entries to add to main settings</ask_confirmation>
      <apply_changes>Update main .claude/settings.local.json with selected entries</apply_changes>
    </if_differences_found>
    <if_no_differences>Inform user no settings need consolidation</if_no_differences>
    <purpose>Preserve useful development settings before removing worktree</purpose>
  </step_7>

  <step_8>
    <description>Final cleanup confirmation</description>
    <summary>
      <display_worktree>Show worktree path and branch name</display_worktree>
      <show_pr_status>Show merged PR details if found</show_pr_status>
      <show_issue_status>Show related issue status if found</show_issue_status>
      <show_last_activity>Display directory creation/modification date</show_last_activity>
    </summary>
    <safety_checks>
      <check_uncommitted>git status --porcelain in worktree directory</check_uncommitted>
      <warn_if_dirty>Alert user if uncommitted changes exist</warn_if_dirty>
    </safety_checks>
    <ask_deletion>Ask user confirmation: "Delete this worktree? (y/N)"</ask_deletion>
    <purpose>Final safety check before irreversible deletion</purpose>
  </step_8>

  <step_9>
    <description>Delete worktree</description>
    <if_confirmed>
      <remove_worktree>git worktree remove {path} --force</remove_worktree>
      <cleanup_branch>git branch -d {branch_name}</cleanup_branch>
      <success_message>Inform user worktree was successfully removed</success_message>
      <next_steps>Suggest running command again to find next candidate</next_steps>
    </if_confirmed>
    <if_declined>Exit gracefully with no changes</if_declined>
    <purpose>Perform the actual cleanup and guide user for next iteration</purpose>
  </step_9>
</execution_steps>

<important_notes>

- Uses PR/MR merge status as the ONLY reliable way to verify if a branch was merged
- DOES NOT use "git branch --merged" command as it's unreliable for merge verification
- Only processes branches with PRs/MRs that were definitively merged to default branch
- Skips worktrees without merged PRs/MRs and continues to next oldest candidate
- Checks and optionally closes related issues
- Prioritizes oldest worktrees by directory age first for systematic cleanup
- Warns about very recent worktrees (created within 24 hours) to avoid cleaning active work
- Preserves useful development settings before deletion
- Requires explicit confirmation before any destructive actions
- Handles locked worktrees automatically
- Processes one worktree at a time to maintain control
- Must be run from default branch for safety

Limitations:
- Assumes remote is named "origin" (most common convention)
- Supports macOS and Linux only (no Windows support)
- Requires MCP server or CLI for git hosting provider (GitHub, GitLab, etc.)
</important_notes>
