---
allowed-tools: Read, mcp__mcp-jq__jq_query, mcp__mcp-jq__jq_query_file, mcp__github__search_pull_requests, mcp__github__pull_request_read, mcp__github__issue_read, mcp__github__issue_write, mcp__github__add_issue_comment, ListMcpResourcesTool
description: Clean up merged worktrees by verifying PR/issue status, consolidating settings, and removing stale worktrees
argument-hint: (no arguments)
---

# Worktree Cleanup

## General Guidelines

### Output Style
- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

Clean up merged worktrees by finding the oldest merged branch, consolidating settings, and removing stale worktrees.

<current_state>
Current branch: !git branch --show-current`
Current worktrees: !git worktree list`
</current_state>

<execution_steps>
<step_0>
  <description>Validate MCP dependencies</description>
  <check_github_mcp>
    <requirement>GitHub MCP server must be configured</requirement>
    <fallback>If unavailable, use `gh` CLI commands</fallback>
    <validation>
      - Try listing available MCP resources
      - If GitHub MCP not found, switch to CLI fallback
      - Inform user about MCP configuration if needed
    </validation>
  </check_github_mcp>
  <error_handling>
    If MCP validation fails:
    - Show clear error message
    - Provide setup instructions
    - Fallback to CLI if possible
  </error_handling>
  <purpose>Ensure required MCP dependencies are available before proceeding</purpose>
</step_0>

  <step_1>
    <description>Verify we're in main branch</description>
    <check_command>git branch --show-current</check_command>
    <required_branch>main</required_branch>
    <error_if_not_main>Exit with error message: "This command must be run from the main branch"</error_if_not_main>
    <purpose>Ensure we're consolidating to the main worktree</purpose>
  </step_1>

  <step_2>
    <description>Get list of all worktrees</description>
    <command>git worktree list --porcelain</command>
    <parse_output>Extract worktree paths and branch names</parse_output>
    <exclude_main>Filter out the main worktree from cleanup candidates</exclude_main>
    <purpose>Identify all worktrees that could potentially be cleaned up</purpose>
  </step_2>

  <step_3>
    <description>Find oldest worktree by directory age</description>
    <get_worktree_ages>
      <command_macos>git worktree list | grep -v "main" | awk '{print $1}' | while read path; do /usr/bin/stat -f "%Sm|%N" -t "%Y-%m-%d %H:%M:%S" "$path" 2>/dev/null; done | sort</command_macos>
      <command_linux>git worktree list | grep -v "main" | awk '{print $1}' | xargs stat -c "%y|%n" | sort</command_linux>
      <purpose>List all worktrees sorted by directory modification time (oldest first)</purpose>
      <note>Use full path /usr/bin/stat on macOS, regular stat on Linux.</note>
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
    <purpose>Identify oldest worktree candidate - actual merge verification happens via GitHub PR in next step</purpose>
  </step_3>

  <step_4>
    <description>Verify GitHub PR merge status (primary merge verification)</description>
    <determine_repo>
      <check_remote>git remote get-url origin</check_remote>
      <parse_repo>Extract owner/repo from GitHub URL</parse_repo>
      <fallback>Use project repository from git remote (owner/repo format)</fallback>
    </determine_repo>
    <search_pr>
      <tool>mcp__github__search_pull_requests</tool>
      <query>repo:owner/repo head:{branch_name} base:main</query>
      <purpose>Find PR for this branch targeting main</purpose>
      <important>This is the PRIMARY way to verify if a branch was merged - NOT git commands</important>
    </search_pr>
    <verify_pr_merged>
      <if_pr_found>
        <get_pr_details>Use mcp__github__pull_request_read to get full PR info</get_pr_details>
        <confirm_merged>Verify PR state is "closed" AND merged_at is not null AND base is "main"</confirm_merged>
        <extract_issue_number>Look for issue references in PR title/body (e.g., #14533, owner/repo#14533)</extract_issue_number>
        <if_merged>Proceed with cleanup - this branch was definitively merged to main</if_merged>
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
    <purpose>Use GitHub PR status as the authoritative source for merge verification instead of unreliable git commands</purpose>
  </step_4>

  <step_4_5>
    <description>Check and close related GitHub issue</description>
    <if_issue_found>
      <get_issue_details>
        <tool>mcp__github__issue_read</tool>
        <method>get</method>
        <extract_repo>From issue reference (main-repo vs cross-repo)</extract_repo>
      </get_issue_details>
      <check_issue_state>
        <if_open>
          <ask_close>Ask user: "Related issue #{number} is still open. Should I close it? (y/N)"</ask_close>
          <if_yes_close>
            <add_closing_comment>
              <tool>mcp__github__add_issue_comment</tool>
              <body_template>Closing this issue as branch {branch_name} was merged to main on {merge_date} via PR #{pr_number}.</body_template>
              <get_merge_date>Extract merge date from PR details</get_merge_date>
              <get_pr_number>Use PR number from search results</get_pr_number>
            </add_closing_comment>
            <close_issue>
              <tool>mcp__github__issue_write</tool>
              <method>update</method>
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
  - Uses GitHub PR merge status as the ONLY reliable way to verify if a branch was merged
  - DOES NOT use "git branch --merged" command as it's unreliable for merge verification
  - Only processes branches with PRs that were definitively merged to main
  - Skips worktrees without merged PRs and continues to next oldest candidate
  - Checks and optionally closes related GitHub issues
  - Prioritizes oldest worktrees by directory age first for systematic cleanup
  - Warns about very recent worktrees (created within 24 hours) to avoid cleaning active work
  - Preserves useful development settings before deletion
  - Requires explicit confirmation before any destructive actions
  - Handles locked worktrees automatically
  - Processes one worktree at a time to maintain control
  - Must be run from main branch for safety
  - Works with standard GitHub repository URLs (owner/repo format)
</important_notes>