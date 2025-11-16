---
allowed-tools: Bash(code-insiders:*), Bash(code:*), Bash(zed:*), Bash(cursor:*), Bash(which:*), Read, mcp__github__issue_read, mcp__ide__getDiagnostics, ListMcpResourcesTool
description: Add a new git worktree from branch name or GitHub issue URL, copy settings, install deps, and open in current IDE
argument-hint: <branch-name-or-github-issue-url> [optional-base-branch]
---

# Git Worktree Setup

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

Create a new git worktree for branch: $ARGUMENTS

<current_state>
Current branch: !git branch --show-current`
Current worktrees: !git worktree list`
Remote branches: !git branch -r`
Uncommitted changes: !git status --short`
</current_state>

<execution_steps>
<!-- docs INCLUDE path='src/fragments/mcp-validation-step.md' -->
<!-- /docs -->

  <step_1>
    <description>Detect current IDE environment</description>
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
    <description>Parse the arguments</description>
    <input>$ARGUMENTS</input>
    <expected_format>branch-name-or-github-url [optional-base-branch]</expected_format>
    <example>fix/issue-123-main-content-area-visually-clipped main</example>
    <example_github_url>https://github.com/owner/project/issues/123 main</example_github_url>
    <default_base_branch>main (if not specified)</default_base_branch>
  </step_1>

  <step_2_5>
    <description>Handle GitHub issue URLs</description>
    <condition>If first argument matches GitHub issue URL pattern</condition>
    <url_detection>Check if argument contains "github.com" and "/issues/"</url_detection>
    <url_parsing>
      <pattern>https://github.com/{owner}/{repo}/issues/{issue_number}</pattern>
      <extract>owner, repo, issue_number from URL</extract>
    </url_parsing>
    <fetch_issue_details>
      <tool>mcp__github__issue_read</tool>
      <method>get</method>
      <parameters>owner, repo, issue_number</parameters>
    </fetch_issue_details>
    <generate_branch_name>
      <determine_type>Analyze issue title/labels to determine type (feat/fix/refactor/chore)</determine_type>
      <format>{type}/{repo}-{issue_number}-{kebab-case-title}</format>
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
  </step_1_5>

  <step_3>
    <description>Add all files and stash uncommitted changes if any exist</description>
    <condition>If output is not empty (has uncommitted changes)</condition>
    <command>git add -A && git stash push -m "Worktree switch: Moving changes to ${branch_name}"</chained_command>
    <purpose>Preserve work in progress before switching worktrees</purpose>
    <note>Remember stash was created for later restoration</note>
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
    <purpose>Ensure we have the latest remote branches and main branch state</purpose>
    <note>This ensures new worktrees are created from the most recent main branch</note>
  </step_6>

  <step_7>
    <description>Check if branch exists on remote</description>
    <command>git branch -r | grep "origin/${branch_name}"</command>
    <decision>
      <if_exists>Branch exists on remote - will checkout existing branch</if_exists>
      <if_not_exists>Branch does not exist - will create new branch from base</if_not_exists>
    </decision>
  </step_5>

  <step_6>
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

  <step_8>
    <description>Copy Claude settings to new worktree</description>
    <source>.claude/settings.local.json</source>
    <destination>${parent_path}/${branch_name}/.claude/settings.local.json</destination>
    <command>cp -r .claude/settings.local.json ${parent_path}/${branch_name}/.claude/settings.local.json</command>
    <purpose>Preserve all permission settings and configurations</purpose>
  </step_8>

  <step_9>
    <description>Copy .env.local files to new worktree</description>
    <search_command>find . -name ".env.local" -type f</search_command>
    <copy_logic>For each .env.local file found, copy to corresponding location in new worktree</copy_logic>
    <common_locations>
      - app/.env.local
      - packages/*/.env.local
      - (any other .env.local files found)
    </common_locations>
    <copy_command>find . -name ".env.local" -type f -exec sh -c 'mkdir -p "$(dirname "${parent_path}/${branch_name}/$1")" && cp "$1" "${parent_path}/${branch_name}/$1"' _ {} \;</copy_command>
    <purpose>Preserve local environment configurations for development</purpose>
    <note>Only copies files that exist; ignores missing ones</note>
  </step_9>

  <step_10>
    <description>Create IDE-specific configuration (conditional)</description>
    <condition>Only if supports_tasks is true (VS Code variants)</condition>
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
    <working_directory>${parent_path}/${branch_name}</working_directory>
    <command>cd ${parent_path}/${branch_name} && pnpm install</command>
    <purpose>Ensure all node_modules are installed for the new worktree</purpose>
  </step_11>

  <step_12>
    <description>Apply stashed changes to new worktree (if stash was created)</description>
    <condition>Only if stash was created in step_3</condition>
    <working_directory>${parent_path}/${branch_name}</working_directory>
    <command>cd ${parent_path}/${branch_name} && git stash pop</command>
    <purpose>Restore uncommitted work-in-progress to the new worktree branch</purpose>
    <note>This moves your uncommitted changes to the new branch where you'll continue working</note>
  </step_12>

  <step_13>
    <description>Open detected IDE in new worktree</description>
    <command>${ide_command} ${parent_path}/${branch_name}</command>
    <ide_specific_behavior>
      <vs_code_variants>Opens folder in VS Code/Insiders/Cursor with tasks.json auto-starting Claude</vs_code_variants>
      <zed>Opens folder in Zed editor</zed>
      <other>Uses detected IDE command to open folder</other>
    </ide_specific_behavior>
    <purpose>Launch development environment for the new worktree using detected IDE</purpose>
    <confirmation_message>Opening worktree in ${ide_name}</confirmation_message>
  </step_11>
</execution_steps>

<important_notes>
  - Automatically detects and uses your current IDE (VS Code, VS Code Insiders, Cursor, Zed, etc.)
  - Creates VS Code-specific tasks.json only for VS Code variants (auto-starts Claude on folder open)
  - Branch names with slashes (feat/, fix/, etc.) are fully supported
  - The worktree directory path will match the full branch name including slashes
  - Settings are copied to maintain the same permissions across worktrees
  - Environment files (.env.local) are copied to preserve local configurations
  - Each worktree has its own node_modules installation
  - Uncommitted changes are automatically stashed and moved to the new worktree
  - Your work-in-progress seamlessly transfers to the new branch
  - IDE detection fallback: checks available editors and uses priority order
</important_notes>