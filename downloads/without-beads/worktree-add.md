---
description: Add a new git worktree from branch name or issue URL, copy settings, install deps, and open in current IDE
argument-hint: <branch-name-or-issue-url> [optional-base-branch]
---

# Git Worktree Setup

## General Guidelines

### Output Style

- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

Create a new git worktree for branch: $ARGUMENTS

<current_state>
Current branch: `git branch --show-current`
Current worktrees: `git worktree list`
Remote branches: `git branch -r`
Uncommitted changes: `git status --short`
</current_state>

<execution_steps>
<step_0>
  <description>Ask user for setup mode</description>
  <prompt>
    <message>How would you like to set up the worktree?</message>
    <options>
      <option value="quick">
        <label>Quick</label>
        <description>Just create the worktree (skip deps, settings, IDE)</description>
      </option>
      <option value="full">
        <label>Full setup</label>
        <description>Install dependencies, copy settings, open in IDE</description>
      </option>
    </options>
  </prompt>
  <set_variable>$SETUP_MODE = user selection ("quick" or "full")</set_variable>
  <purpose>Allow quick worktree creation when user just needs the branch</purpose>
</step_0>

<step_0b>
  <description>Detect git hosting provider and available tools (only needed if argument is an issue URL)</description>
  <condition>Only run this step if first argument looks like a git hosting URL</condition>
<detect_provider>
  <check_remote_url>git remote get-url origin</check_remote_url>
  <identify_host>
    - github.com → GitHub
    - gitlab.com → GitLab
    - bitbucket.org → Bitbucket
    - Other → Ask user
  </identify_host>
</detect_provider>
<check_available_tools>
  <list_mcp_servers>Check which git-hosting MCP servers are available (github, gitlab, etc.)</list_mcp_servers>
  <check_cli>Check if gh/glab CLI is available as fallback</check_cli>
</check_available_tools>
<select_tool>
  <if_single_mcp>If only one relevant MCP available, confirm with user</if_single_mcp>
  <if_multiple>Let user choose which tool to use</if_multiple>
  <if_told_earlier>If user specified tool earlier in conversation, use that without asking again</if_told_earlier>
  <store_as>$GIT_HOST_TOOL (e.g., "github_mcp", "gitlab_mcp", "gh_cli")</store_as>
</select_tool>

  <purpose>Detect git hosting provider and select appropriate tool for issue lookup</purpose>
</step_0b>

  <step_1>
    <description>Detect current IDE environment</description>
    <condition>Only if $SETUP_MODE is "full"</condition>
    <detection_methods>
      <method_1>
        <tool>mcp__ide__getDiagnostics</tool>
        <vs_code_insiders>Check for paths containing "Code - Insiders"</vs_code_insiders>
        <vs_code>Check for paths containing "Code/" or "Code.app"</vs_code>
        <cursor>Check for paths containing "Cursor"</cursor>
        <zed>Check for paths containing "Zed"</zed>
      </method_1>
      <method_2>
        <fallback_detection>Use which command to find available IDEs</fallback_detection>
        <commands>which code-insiders code zed cursor</commands>
        <priority_order>code-insiders > cursor > zed > code</priority_order>
      </method_2>
    </detection_methods>
    <set_variables>
      <ide_command>Detected command (code-insiders|code|zed|cursor)</ide_command>
      <ide_name>Human-readable name</ide_name>
      <supports_tasks>true for VS Code variants, false for others</supports_tasks>
    </set_variables>
    <purpose>Automatically detect which IDE to use for opening the new worktree</purpose>
  </step_1>

  <step_2>
    <description>Determine default branch and parse arguments</description>
    <find_default_branch>
      <command>git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'</command>
      <fallback>git remote show origin | grep 'HEAD branch' | cut -d: -f2 | tr -d ' '</fallback>
      <store_as>$DEFAULT_BRANCH (typically "main" or "master")</store_as>
    </find_default_branch>
    <input>The user-provided arguments</input>
    <expected_format>branch-name-or-issue-url [optional-base-branch]</expected_format>
    <example>fix/issue-123-main-content-area-visually-clipped main</example>
    <example_issue_url>https://github.com/owner/project/issues/123 main</example_issue_url>
    <base_branch>Use provided base branch, or $DEFAULT_BRANCH if not specified</base_branch>
  </step_2>

  <step_2_5>
    <description>Handle issue URLs from git hosting provider</description>
    <condition>If first argument matches issue URL pattern (detected in step_0)</condition>
    <url_detection>
      <github>Check if argument contains "github.com" and "/issues/"</github>
      <gitlab>Check if argument contains "gitlab.com" and "/-/issues/"</gitlab>
      <bitbucket>Check if argument contains "bitbucket.org" and "/issues/"</bitbucket>
    </url_detection>
    <url_parsing>
      <github_pattern><https://github.com/{owner}/{repo}/issues/{issue_number}></github_pattern>
      <gitlab_pattern><https://gitlab.com/{owner}/{repo}/-/issues/{issue_number}></gitlab_pattern>
      <bitbucket_pattern><https://bitbucket.org/{owner}/{repo}/issues/{issue_number}></bitbucket_pattern>
      <extract>owner, repo, issue_number from URL</extract>
    </url_parsing>
    <fetch_issue_details>
      <tool>Use $GIT_HOST_TOOL from step_0</tool>
      <method>get issue details</method>
      <parameters>owner, repo, issue_number</parameters>
    </fetch_issue_details>
    <generate_branch_name>
      <determine_type>Analyze issue title/labels to determine type (feat/fix/refactor/chore)</determine_type>
      <format>{type}/issue-{issue_number}-{kebab-case-title}</format>
      <kebab_case>Convert title to lowercase, replace spaces/special chars with hyphens</kebab_case>
      <sanitization>
        <rule>Always use lowercase for branch names</rule>
        <rule>Replace # with - (hash symbol not allowed in git branch names)</rule>
        <rule>Remove or replace other special characters: @, $, %, ^, &, *, (, ), [, ], {, }, \, |, ;, :, ", ', <, >, ?, /, ~, `</rule>
        <rule>Replace multiple consecutive hyphens with single hyphen</rule>
        <rule>Trim leading/trailing hyphens</rule>
      </sanitization>
      <truncate>Limit total branch name to reasonable length (~60 chars)</truncate>
    </generate_branch_name>
    <user_confirmation>
      <display>Show generated branch name and ask for confirmation</display>
      <options>"Yes, proceed" or "No, exit" or "Edit branch name"</options>
      <if_no>Exit command gracefully</if_no>
      <if_edit>Allow user to modify the branch name</if_edit>
      <if_yes>Continue with generated/modified branch name</if_yes>
    </user_confirmation>
    <examples>
      <input>https://github.com/owner/project/issues/456</input>
      <title>"Fix duplicate items in list view"</title>
      <generated>fix/issue-456-duplicate-items-in-list-view</generated>
    </examples>
  </step_2_5>

  <step_3>
    <description>Handle uncommitted changes if any exist</description>
    <condition>If git status --short output is not empty (has uncommitted changes)</condition>
    <prompt>
      <message>You have uncommitted changes. Move them to the new branch?</message>
      <options>
        <option value="yes">
          <label>Yes</label>
          <description>Stash changes and apply them in the new worktree</description>
        </option>
        <option value="no">
          <label>No</label>
          <description>Leave changes in current branch</description>
        </option>
      </options>
    </prompt>
    <if_yes>
      <command>git add -A && git stash push -m "Worktree switch: Moving changes to ${branch_name}"</command>
      <set_variable>$STASH_CREATED = true</set_variable>
    </if_yes>
    <if_no>
      <set_variable>$STASH_CREATED = false</set_variable>
    </if_no>
    <purpose>Let user decide whether to move work in progress to new branch</purpose>
  </step_3>

  <step_4>
    <description>Determine worktree parent directory</description>
    <check_if_in_worktree>git rev-parse --is-inside-work-tree && git worktree list --porcelain | grep "$(git rev-parse --show-toplevel)"</check_if_in_worktree>
    <set_parent_path>
      <if_main_worktree>Set parent_path=".."</if_main_worktree>
      <if_secondary_worktree>Set parent_path="../.." (need to go up two levels)</if_secondary_worktree>
    </set_parent_path>
    <purpose>Correctly determine where to create new worktree regardless of current location</purpose>
    <note>This handles both main worktree and secondary worktree scenarios</note>
  </step_4>

  <step_5>
    <description>Fetch latest changes from remote</description>
    <command>git fetch origin</command>
    <purpose>Ensure we have the latest remote branches and default branch state</purpose>
    <note>This ensures new worktrees are created from the most recent default branch</note>
  </step_5>

  <step_6>
    <description>Check if branch exists on remote</description>
    <command>git branch -r | grep "origin/${branch_name}"</command>
    <decision>
      <if_exists>Branch exists on remote - will checkout existing branch</if_exists>
      <if_not_exists>Branch does not exist - will create new branch from base</if_not_exists>
    </decision>
  </step_6>

  <step_7>
    <description>Create the worktree</description>
    <option_a_new_branch>
      <condition>Remote branch does NOT exist</condition>
      <command>git worktree add ${parent_path}/${branch_name} -b ${branch_name} ${base_branch}</command>
      <example>git worktree add ../fix/issue-123-main-content-area-visually-clipped -b fix/issue-123-main-content-area-visually-clipped main</example>
    </option_a_new_branch>
    <option_b_existing_branch>
      <condition>Remote branch EXISTS</condition>
      <command>git worktree add ${parent_path}/${branch_name} ${branch_name}</command>
      <example>git worktree add ../fix/issue-123-main-content-area-visually-clipped fix/issue-123-main-content-area-visually-clipped</example>
    </option_b_existing_branch>
  </step_7>

  <step_7b>
    <description>Set up remote tracking for new branch</description>
    <condition>Only if new branch was created (option_a from step_7)</condition>
    <working_directory>${parent_path}/${branch_name}</working_directory>
    <command>cd ${parent_path}/${branch_name} && git push -u origin ${branch_name}</command>
    <purpose>Establish remote tracking so git status shows ahead/behind and git push/pull work without specifying remote</purpose>
    <note>This creates the remote branch and sets upstream tracking in one step</note>
  </step_7b>

  <step_7c>
    <description>Quick mode completion</description>
    <condition>Only if $SETUP_MODE is "quick"</condition>
    <message>Worktree created at: ${parent_path}/${branch_name}</message>
    <suggested_next_steps>
      <intro>You can now:</intro>
      <suggestion priority="1">Open in VS Code: `code ${parent_path}/${branch_name}`</suggestion>
      <suggestion priority="2">Open in Cursor: `cursor ${parent_path}/${branch_name}`</suggestion>
      <suggestion priority="3">Navigate to it: `cd ${parent_path}/${branch_name}`</suggestion>
      <suggestion priority="4">Install dependencies: `cd ${parent_path}/${branch_name} && pnpm install`</suggestion>
    </suggested_next_steps>
    <action>STOP here - do not continue to remaining steps</action>
  </step_7c>

  <step_8>
    <description>Copy Claude settings to new worktree</description>
    <condition>Only if $SETUP_MODE is "full"</condition>
    <source>.claude/settings.local.json</source>
    <destination>${parent_path}/${branch_name}/.claude/settings.local.json</destination>
    <command>cp -r .claude/settings.local.json ${parent_path}/${branch_name}/.claude/settings.local.json</command>
    <purpose>Preserve all permission settings and configurations</purpose>
  </step_8>

  <step_9>
    <description>Copy .env.local files to new worktree</description>
    <condition>Only if $SETUP_MODE is "full"</condition>
    <search_command>find . -name ".env.local" -type f</search_command>
    <copy_logic>For each .env.local file found, copy to corresponding location in new worktree</copy_logic>
    <common_locations>
      - app/.env.local
      - packages/*/.env.local
      - (any other .env.local files found)
    </common_locations>
    <copy_command>find . -name ".env.local" -type f -exec sh -c 'mkdir -p "$(dirname "${parent_path}/${branch_name}/$1")" && cp "$1" "${parent_path}/${branch_name}/$1"'_ {} \;</copy_command>
    <purpose>Preserve local environment configurations for development</purpose>
    <note>Only copies files that exist; ignores missing ones</note>
  </step_9>

  <step_10>
    <description>Create IDE-specific configuration (conditional)</description>
    <condition>Only if $SETUP_MODE is "full" AND supports_tasks is true (VS Code variants)</condition>
    <vs_code_tasks>
      <create_directory>mkdir -p ${parent_path}/${branch_name}/.vscode</create_directory>
      <create_file_command>cat > ${parent_path}/${branch_name}/.vscode/tasks.json << 'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Auto start Claude",
      "type": "shell",
      "command": "claude",
      "runOptions": {
        "runOn": "folderOpen"
      },
      "presentation": {
        "echo": false,
        "reveal": "always",
        "focus": true,
        "panel": "new"
      }
    }
  ]
}
EOF</create_file_command>
    </vs_code_tasks>
    <purpose>Create auto-start Claude task for VS Code variants on folder open</purpose>
    <note>Only creates for VS Code variants (code, code-insiders, cursor)</note>
    <skip_message>Skipping IDE-specific config for non-VS Code IDEs</skip_message>
  </step_10>

  <step_11>
    <description>Install dependencies in new worktree</description>
    <condition>Only if $SETUP_MODE is "full"</condition>
    <working_directory>${parent_path}/${branch_name}</working_directory>
    <command>cd ${parent_path}/${branch_name} && pnpm install</command>
    <purpose>Ensure all node_modules are installed for the new worktree</purpose>
  </step_11>

  <step_12>
    <description>Apply stashed changes to new worktree (if stash was created)</description>
    <condition>Only if $SETUP_MODE is "full" AND $STASH_CREATED is true</condition>
    <working_directory>${parent_path}/${branch_name}</working_directory>
    <command>cd ${parent_path}/${branch_name} && git stash pop</command>
    <purpose>Restore uncommitted work-in-progress to the new worktree branch</purpose>
    <note>This moves your uncommitted changes to the new branch where you'll continue working</note>
  </step_12>

  <step_13>
    <description>Open detected IDE in new worktree</description>
    <condition>Only if $SETUP_MODE is "full"</condition>
    <command>${ide_command} ${parent_path}/${branch_name}</command>
    <ide_specific_behavior>
      <vs_code_variants>Opens folder in VS Code/Insiders/Cursor with tasks.json auto-starting Claude</vs_code_variants>
      <zed>Opens folder in Zed editor</zed>
      <other>Uses detected IDE command to open folder</other>
    </ide_specific_behavior>
    <purpose>Launch development environment for the new worktree using detected IDE</purpose>
    <confirmation_message>Opening worktree in ${ide_name}</confirmation_message>
  </step_13>
</execution_steps>

<important_notes>

- Offers Quick or Full setup mode - Quick just creates the worktree, Full does everything
- Automatically detects and uses your current IDE (VS Code, VS Code Insiders, Cursor, Zed, etc.) in Full mode
- Creates VS Code-specific tasks.json only for VS Code variants (auto-starts Claude on folder open)
- Branch names with slashes (feat/, fix/, etc.) are fully supported
- The worktree directory path will match the full branch name including slashes
- Settings are copied to maintain the same permissions across worktrees
- Environment files (.env.local) are copied to preserve local configurations
- Each worktree has its own node_modules installation
- Uncommitted changes are automatically stashed and moved to the new worktree
- Your work-in-progress seamlessly transfers to the new branch
- IDE detection fallback: checks available editors and uses priority order
- New branches are automatically pushed with `-u` to set up remote tracking

Limitations:

- Assumes remote is named "origin" (most common convention)
- Supports macOS and Linux only (no Windows support)
- Requires MCP server or CLI for git hosting provider when using issue URLs (GitHub, GitLab, etc.)
- Dependency install command is pnpm (modify for npm/yarn if needed)
</important_notes>
