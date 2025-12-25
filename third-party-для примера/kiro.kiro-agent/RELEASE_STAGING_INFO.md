# Release Staging Branch: release-staging-stable-20251215-230104

**Created:** 2025-12-15 23:01:05 UTC
**Base Commit:** cabefbce7d9a9bb396a281cb7f47692c113b3641
**Target Channel:** stable


## Purpose
This staging branch was created to prepare a stable release.
Changes can be cherry-picked onto this branch using the cherry-pick workflow.

## Next Steps
1. Use the "Cherry-pick to Extension Staging" workflow to add specific commits
2. Test the staging branch thoroughly
3. When ready, use the "Release Extension" workflow with this branch as the commit_sha

## Cherry-picked Changes
(This section will be updated as changes are cherry-picked)


### Cherry-picked: 2025-12-17 20:53:54 UTC
- **Commit:** bda19b32c52cac8f66556f04ecf11092ca04a169
- **Original Message:** fix: multiple minor ui ux issues (#2603)
- **Description:** Minor UI/UX fixes for the chat
- **Status:** ✅ Successfully applied


### Cherry-picked: 2025-12-18 00:23:05 UTC
- **Commit:** 7c6cd684eba3e238e2b891443f65bf4a71fc0647
- **Original Message:** feat(agent): add glob pattern matching and tag-based filtering for tools (#2819)
- **Description:** Add glob pattern matching and tag-based filtering for tools
- **Status:** ✅ Successfully applied


### Cherry-picked: 2025-12-18 00:24:09 UTC
- **Commit:** cfaadd64347f29ad35ba9211a11d4801db0ec05f
- **Original Message:** refactor: Rename prompts to custom agents (#2820)
- **Description:** Rename prompts to custom agents
- **Status:** ✅ Successfully applied


### Cherry-picked: 2025-12-18 00:26:28 UTC
- **Commit:** 4973e2bbec91cf3c8e84622ec3b4f3ed3f4f6b5e
- **Original Message:** feat: add yielding to spec chat (#2823)
- **Description:** Yield in spec chat
- **Status:** ✅ Successfully applied


### Cherry-picked: 2025-12-18 00:34:44 UTC
- **Commit:** d6f9f4fbdc84f635e474a7be5acb9fca32604a44
- **Original Message:** feat(UsageSummary): update rendering logic for individual vs enterpri… (#2827)
- **Description:** Rendering logic for usageSummary
- **Status:** ✅ Successfully applied


### Cherry-picked: 2025-12-18 18:51:39 UTC
- **Commit:** a9cf367159ba1a6acb51e2257d5690b6cb53a59f
- **Original Message:** fix: restore providerTitle for context search results (#2839)
- **Description:** Restore provider title for context search results
- **Status:** [OK] Successfully applied


### Cherry-picked: 2025-12-18 18:53:28 UTC
- **Commit:** 0ff71f304d96ad803f4845034b26f1d4ac662d53
- **Original Message:** chore: rearrange accept/reject and rename undo accept to revert (#2842)
- **Description:** rearrange accept/reject and other minor actions ui updates
- **Status:** [OK] Successfully applied


### Cherry-picked: 2025-12-18 19:25:25 UTC
- **Commit:** 95a3a0bb968d54c7a08fb7ef32000657db99e893
- **Original Message:** fix: Instruct create hook agent to only create valid hooks (#2840)
- **Description:** instruct the create hook agent to only create valid hooks
- **Status:** [OK] Successfully applied


### Cherry-picked: 2025-12-18 19:28:53 UTC
- **Commit:** 7ccac864c87edb09e191da63183a6eea0564e445
- **Original Message:** fix: approval is problematic right now, try to address (#2838)
- **Description:** address approval process in subagents
- **Status:** [OK] Successfully applied


### Cherry-picked: 2025-12-18 22:03:29 UTC
- **Commit:** 56d4c3b4df6076d5267798a9e48124d15eb414c4
- **Original Message:** fix: route final responses to USER_HOOK_AGENT_STOP before ending (#2849)
- **Description:** Fix for agent stop on hooks
- **Status:** [OK] Successfully applied


### Cherry-picked: 2025-12-18 22:48:08 UTC
- **Commit:** 929525b574aa8f533c8f298d54f6e140283d2674
- **Original Message:** fix (#2851)
- **Description:** fix for sub agent write file UI error
- **Status:** [OK] Successfully applied

