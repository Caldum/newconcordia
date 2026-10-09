# Owner steps

Everything that depends on the owner's accounts or credentials. The code is ready to use them: until they
exist, the CI jobs that need them are skipped with a notice and everything else stays green.

This file grows as each module needs something new.

## Summary

| # | Step | Unblocks |
| --- | --- | --- |
| 1 | Protect `main` and `develop` on GitHub | Merges without review |

## 1. Protect the branches on GitHub

1. On GitHub: **Settings → Rules → Rulesets → New branch ruleset**.
2. Name `main`, target `main`. Enable *Restrict deletions*, *Require a pull request before merging*
   (1 approval), *Require status checks to pass* (add the CI check once it appears after the first PR) and
   *Block force pushes*.
3. Repeat for `develop`, without requiring approval (only the checks and *Block force pushes*).
