# Ability • Reporting & Follow-up Prototype (v2)

✅ Plain HTML/CSS/JS (Bootstrap)  
✅ Uses **sessionStorage** only (no localStorage)  
✅ `index.html` is the entry point (works with VSCode GoLive + Vercel)

## Run
- Open the folder in VS Code
- Right click `index.html` → **Open with Live Server** (GoLive)
- Or deploy the folder to Vercel

## Reset
Open DevTools console and run:
`__abilityReset()`

## Reporting Rules Implemented
- 2 observations by default, **no pairs initially**
- **Add Recommendation** button visible only to auditors:
  - Internal Audit Head (IAH)
  - Backup Head of Internal Audit
  - Proposed Job Approver
  - Resources list users
- One pair contains:
  - Recommended Action Step
  - Multiple **Management Auditees** selector (ONLY management auditee users shown)
  - No duplicate auditee users inside one pair (type can repeat)
  - One Management Comments field + one Implementation Date
  - reporting submittedBy/submittedAt + approvedBy/approvedAt
- Management submits → auditors approve or feedback
- When **all pairs approved** (and at least 1 pair), **Final Approve Observation** appears
- Final approve moves observation to **Follow-up** (step becomes 5)

## Follow-up Rules Implemented
- Reporting fields locked
- Two new fields per pair:
  - Recommendations Implemented (default **Yes**)
  - Comments
  - If Implemented = No → Next Implementation Date appears
  - follow-up submittedBy/submittedAt + approvedBy/approvedAt (separate from reporting)
- Management submits → auditors approve or feedback
- If auditors approve while Implemented=No → status becomes **Reopened** (management can edit again)
- Pair is only completed when auditors approve after Implemented=Yes
- When all pairs completed → Final Approve Observation (follow-up)
