/* Ability Prototype v2 (Reporting + Follow-up)
   - sessionStorage only
   - role switcher
   - no page reloads (prevents the 'scroll to top' bug)
*/
(() => {
  const STORAGE_KEY = "ability_model_state_v2";
  const ROLE_KEY = "ability_model_role_v2";
  const VIEW_KEY = "ability_model_view_v2"; // reporting-list | reporting-particulars | followup-list | followup-particulars
  const ENG_KEY = "ability_model_eng_v2";

  const ROLE_OPTIONS = [
    { key: "IAH", label: "IAH (Internal Audit Head)", userId: 41 },
    { key: "RESOURCE", label: "Resource (Audit Executive)", userId: 98 },
    { key: "APPROVER", label: "Proposed Job Approver", userId: 99 },
    { key: "BACKUP_IAH", label: "Backup Head of Internal Audit", userId: 97 },
    { key: "MGMT_A", label: "Management Auditee • A", userId: 43 },
    { key: "MGMT_B", label: "Management Auditee • B", userId: 44 },
  ];

  const DEFAULT_STATE = {
    company: "Abilite",
    year: 2026,
    users: [
      { id: 41, name: "IAH", hierarchy: "IAH" },
      { id: 98, name: "Sardar Ali", hierarchy: "Audit_Executive_2" },
      { id: 97, name: "Backup IAH", hierarchy: "Audit_Executive_1" },
      { id: 99, name: "Proposed Approver", hierarchy: "Proposed_Job_Approver" },
      { id: 42, name: "Team Lead", hierarchy: "Team_Lead" },

      // Selector must show ONLY these:
      { id: 43, name: "Management Auditee A", hierarchy: "Management_Auditee" },
      { id: 44, name: "Management Auditee B", hierarchy: "Management_Auditee" },
    ],
    subLocationList: [{ id: 1262, description: "Dubai", location: "United Arab Emirates" }],
    engagements: [{
      id: 21,
      title: "1. Checklist",
      riskApproach: "Checklist",
      plannedStartDate: "2026-02-04",
      plannedEndDate: "2026-02-18",
      resourceAllocation: {
        headOfInternalAudit: 41,
        backupHeadOfInternalAudit: 97,
        proposedJobApprover: 99,
        resourcesList: [98, 42],
      },
      reportingList: [
        {
          id: 4, observationTitle: "1. area", observationName: "<p>1. area</p>", area: "1. area", stepNo: 2, phase: "reporting", subLocation: 1262, pairs: [],
          reportingFinalApproved: false, reportingFinalApprovedBy: null, reportingFinalApprovedAt: null,
          followupFinalApproved: false, followupFinalApprovedBy: null, followupFinalApprovedAt: null,
        },
        {
          id: 5, observationTitle: "2. area", observationName: "<p>2. area</p>", area: "2. area", stepNo: 2, phase: "reporting", subLocation: 1262, pairs: [],
          reportingFinalApproved: false, reportingFinalApprovedBy: null, reportingFinalApprovedAt: null,
          followupFinalApproved: false, followupFinalApprovedBy: null, followupFinalApprovedAt: null,
        },
      ]
    }]
  };

  // ---------- helpers ----------
  const uid = () => Date.now() + Math.floor(Math.random() * 1000);
  const nowISO = () => new Date().toISOString().slice(0, 10);
  const esc = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const stripHtml = (html) => { const d = document.createElement("div"); d.innerHTML = html || ""; return d.textContent || d.innerText || ""; };
  const fmtDate = (d) => d ? String(d).slice(0, 10) : "";
  const uniq = (a) => [...new Set(a)];

  const load = () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const st = JSON.parse(raw);
      if (!st?.engagements) return structuredClone(DEFAULT_STATE);
      return st;
    } catch { return structuredClone(DEFAULT_STATE); }
  };
  const save = (st) => sessionStorage.setItem(STORAGE_KEY, JSON.stringify(st));

  const getRoleKey = () => sessionStorage.getItem(ROLE_KEY) || "RESOURCE";
  const setRoleKey = (k) => sessionStorage.setItem(ROLE_KEY, k);
  const getView = () => sessionStorage.getItem(VIEW_KEY) || "reporting-list";
  const setView = (v) => sessionStorage.setItem(VIEW_KEY, v);
  const getEngId = (st) => Number(sessionStorage.getItem(ENG_KEY) || st.engagements?.[0]?.id || 21);
  const setEngId = (id) => sessionStorage.setItem(ENG_KEY, String(id));

  const getCurrentUser = (st) => {
    const rk = getRoleKey();
    const role = ROLE_OPTIONS.find(r => r.key === rk) || ROLE_OPTIONS[0];
    const user = st.users.find(u => Number(u.id) === Number(role.userId)) || st.users[0];
    return { rk, role, user };
  };

  function updateReportingSubmitButton(obsId, pairId) {
    const st = load();
    const eng = st.engagements.find(x => Number(x.id) === getEngId(st)) || st.engagements[0];
    const obs = findObs(eng, obsId);
    const pair = findPair(obs, pairId);
    const btn = document.getElementById(`rep-submit-${obsId}-${pairId}`);
    if (!btn) return;

    const ready = pair.mgmtComment && pair.mgmtComment.trim() !== ""
      && pair.implementationDate && pair.implementationDate.trim() !== "";

    btn.disabled = !ready;
  }


  const getUser = (st, id) => st.users.find(u => Number(u.id) === Number(id));
  const mgmtUsers = (st) => st.users.filter(u => u.hierarchy === "Management_Auditee");
  const isAuditor = (eng, userId) => {
    const ra = eng.resourceAllocation || {};
    return Number(userId) === Number(ra.headOfInternalAudit)
      || Number(userId) === Number(ra.backupHeadOfInternalAudit)
      || Number(userId) === Number(ra.proposedJobApprover)
      || (ra.resourcesList || []).some(x => Number(x) === Number(userId));
  };
  const pairVisibleToMgmt = (pair, userId) => (pair.auditees || []).some(a => Number(a.userId) === Number(userId));

  const statusBadge = (s) => {
    const k = (s || "draft").toLowerCase();
    if (k === "approved" || k === "approved_final") return `<span class="badge badge-status badge-approved">Approved</span>`;
    if (k === "submitted") return `<span class="badge badge-status badge-submitted">Submitted</span>`;
    if (k === "feedback") return `<span class="badge badge-status badge-feedback">Feedback</span>`;
    if (k === "reopened") return `<span class="badge badge-status badge-feedback">Reopened</span>`;
    return `<span class="badge badge-status badge-draft">Draft</span>`;
  };

  // ---------- UI layout ----------
  function mountHeader(st) {
    const el = document.getElementById("model-header");
    const { rk, role, user } = getCurrentUser(st);
    el.innerHTML = `
      <div class="topbar py-2">
        <div class="page-wrap d-flex align-items-center justify-content-between gap-3">
          <div class="brand-badge">
            <i class="fa fa-shield"></i>
            <span>Ability • Prototype</span>
            <span class="badge badge-step ms-2">${esc(st.company)} • ${esc(st.year)}</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="role-pill">${esc(user.name)} • ${esc(role.label)}</span>
            <select id="roleSelect" class="form-select form-select-sm" style="min-width:300px;">
              ${ROLE_OPTIONS.map(r => `<option value="${r.key}" ${r.key === rk ? "selected" : ""}>${esc(r.label)}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>
    `;
    el.querySelector("#roleSelect").addEventListener("change", (e) => {
      setRoleKey(e.target.value);
      renderPreserve();
    });
  }

  function mountSidebar(active) {
    const el = document.getElementById("model-sidebar");
    el.innerHTML = `
      <div class="sidebar-mock">
        <div class="d-flex align-items-center gap-2 mb-2">
          <i class="fa fa-bars"></i><div style="font-weight:800;">Menu</div>
        </div>
        <div class="group-title">Reporting & Followup</div>
        <a href="#" data-nav="reporting-list" class="${active.startsWith("reporting") ? "active" : ""}"><i class="fa fa-file-text-o me-2"></i>Reporting</a>
        <a href="#" data-nav="followup-list" class="${active.startsWith("followup") ? "active" : ""}"><i class="fa fa-check-square-o me-2"></i>Follow Up</a>
      </div>
    `;
    el.querySelectorAll("[data-nav]").forEach(a => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        setView(a.getAttribute("data-nav"));
        renderTop();
      });
    });
  }

  // ---------- pages ----------
  function mountReportingList(st) {
    const root = document.getElementById("page-root");
    const rows = st.engagements.map((e, i) => {
      const locs = uniq(st.subLocationList.map(s => s.location));
      const sub = uniq(st.subLocationList.map(s => s.description));
      return `
        <tr>
          <td>${i + 1}</td>
          <td><a href="#" class="text-primary fw-bold" data-open-eng="${e.id}">${esc(e.title)}</a></td>
          <td>Awaiting Management Comments (Step 2)</td>
          <td>${(e.reportingList || []).length}</td>
          <td>${locs.map(x => `<span class="chip">${esc(x)}</span>`).join("")}</td>
          <td>${sub.map(x => `<span class="chip">${esc(x)}</span>`).join("")}</td>
          <td><span class="chip">—</span></td>
          <td><span class="chip">—</span></td>
          <td><a href="#" data-open-eng="${e.id}"><i class="fa fa-eye"></i></a></td>
        </tr>`;
    }).join("");

    root.innerHTML = `
      <header class="my-3 d-flex align-items-center justify-content-between">
        <div class="heading">Reporting</div>
      </header>
      <div class="card-like p-3">
        <div class="table-responsive">
          <table class="table table-bordered table-hover mb-0">
            <thead>
              <tr><th>Sr.#</th><th>Particulars</th><th>Status</th><th>No. of Observations</th><th>Location</th><th>Sub Location</th><th>Department</th><th>Sub Department</th><th>Action</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
    root.querySelectorAll("[data-open-eng]").forEach(a => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        setEngId(a.getAttribute("data-open-eng"));
        setView("reporting-particulars");
        renderTop();
      });
    });
  }

  function mountFollowupList(st) {
    const root = document.getElementById("page-root");
    const rows = st.engagements.map((e, i) => {
      const locs = uniq(st.subLocationList.map(s => s.location));
      const sub = uniq(st.subLocationList.map(s => s.description));
      const fuCount = (e.reportingList || []).filter(o => o.phase !== "reporting").length;
      return `
        <tr>
          <td>${i + 1}</td>
          <td><a href="#" class="text-primary fw-bold" data-open-fu="${e.id}">${esc(e.title)}</a></td>
          <td>${fuCount ? "Exceptions Implemented (In Progress)" : "Exception To Be Implemented"}</td>
          <td>${fuCount}</td>
          <td>${locs.map(x => `<span class="chip">${esc(x)}</span>`).join("")}</td>
          <td>${sub.map(x => `<span class="chip">${esc(x)}</span>`).join("")}</td>
          <td><span class="chip">—</span></td>
          <td><span class="chip">—</span></td>
          <td><a href="#" data-open-fu="${e.id}"><i class="fa fa-eye"></i></a></td>
        </tr>`;
    }).join("");

    root.innerHTML = `
      <header class="my-3 d-flex align-items-center justify-content-between">
        <div class="heading">Follow Up</div>
      </header>
      <div class="card-like p-3">
        <div class="table-responsive">
          <table class="table table-bordered table-hover mb-0">
            <thead>
              <tr><th>Sr.#</th><th>Particulars</th><th>Status</th><th>No. of Observations</th><th>Location</th><th>Sub Location</th><th>Department</th><th>Sub Department</th><th>Action</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
    root.querySelectorAll("[data-open-fu]").forEach(a => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        setEngId(a.getAttribute("data-open-fu"));
        setView("followup-particulars");
        renderTop();
      });
    });
  }

  function richMock(label, html) {
    return `
      <label>${esc(label)}</label>
      <div class="border rounded-3">
        <div class="p-2 border-bottom bg-light small text-muted">readonly</div>
        <div class="p-2">${esc(stripHtml(html))}</div>
      </div>`;
  }

  // ----- Reporting Particulars -----
  function mountReportingParticulars(st) {
    const root = document.getElementById("page-root");
    const eng = st.engagements.find(e => Number(e.id) === getEngId(st)) || st.engagements[0];
    const { rk, user } = getCurrentUser(st);
    const auditor = isAuditor(eng, user.id);

    const obsHtml = (eng.reportingList || []).map(obs => {
      const pairs = obs.pairs || [];
      const approved = pairs.filter(p => (p.reporting?.status || "draft") === "approved").length;
      const total = pairs.length;
      const canAdd = obs.phase === "reporting" && auditor;

      const visiblePairs = pairs.filter(p => rk.startsWith("MGMT") ? pairVisibleToMgmt(p, user.id) : true);
      const pairsHtml = visiblePairs.map((p, i) => renderReportingPair(st, eng, obs, p, i)).join("") || `<div class="help-note">No pairs yet.</div>`;

      const canFinalApprove = obs.phase === "reporting" && auditor && total > 0 && approved === total && !obs.reportingFinalApproved;

      return `
        <div class="accordion-item">
          <h2 class="accordion-header" id="h-${obs.id}">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#c-${obs.id}">
              <div class="d-flex w-100 justify-content-between align-items-center">
                <div><b>${esc(obs.observationTitle)}</b> — Step ${obs.stepNo} — Reporting</div>
                <span class="badge badge-step">${approved}/${total} pairs approved</span>
              </div>
            </button>
          </h2>
          <div id="c-${obs.id}" class="accordion-collapse collapse" data-bs-parent="#acc">
            <div class="accordion-body">
              <div class="d-flex justify-content-between gap-3 flex-wrap">
                <div class="flex-grow-1" style="min-width:280px;">
                  <label>Observation Title</label>
                  <input class="form-control" value="${esc(obs.observationTitle)}" disabled />
                </div>
                <div class="d-flex align-items-end">
                  <span class="chip"><i class="fa fa-map-marker"></i> ${esc((st.subLocationList.find(s => Number(s.id) === Number(obs.subLocation)) || {}).description || "—")}</span>
                </div>
              </div>

              ${eng.riskApproach === "Checklist" ? `
                <div class="mt-3">
                  <label>Area</label>
                  <input class="form-control" value="${esc(obs.area)}" disabled />
                </div>` : ""}

              <div class="mt-3">${richMock("Observation", obs.observationName)}</div>

              <hr class="my-4" />

              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="sub-heading">Recommendations (Pairs)</div>
                  <div class="help-note">Auditors create pairs. Management submits. Auditors approve/feedback. Final approve only when all pairs approved.</div>
                </div>
                ${canAdd ? `<button class="btn btn-outline-primary btn-sm" data-act="rep-add-pair" data-obs="${obs.id}"><i class="fa fa-plus me-1"></i>Add Recommendation</button>` : ""}
              </div>

              <div class="mt-3 d-grid gap-3">${pairsHtml}</div>

              ${canFinalApprove ? `
                <div class="divider-soft"></div>
                <div class="d-flex justify-content-end">
                  <button class="btn btn-primary" data-act="rep-final-approve" data-obs="${obs.id}"><i class="fa fa-check me-2"></i>Final Approve Observation</button>
                </div>` : (obs.reportingFinalApproved ? `<div class="divider-soft"></div><div class="text-end"><span class="badge bg-success">Observation approved • moved to Follow-up</span></div>` : "")}
            </div>
          </div>
        </div>`;
    }).join("");

    root.innerHTML = `
      <header class="my-3 d-flex align-items-center">
        <a href="#" class="text-primary me-3" data-act="nav-reporting"><i class="fa fa-arrow-left"></i></a>
        <div class="heading">Reporting</div>
      </header>
      <div class="card-like p-3">
        <div class="sub-heading mb-2">${esc(eng.title)}</div>
        <div class="accordion" id="acc">${obsHtml}</div>
      </div>
    `;
  }

  function renderReportingPair(st, eng, obs, pair, index) {
    const { rk, user } = getCurrentUser(st);
    const auditor = isAuditor(eng, user.id);

    pair.reporting ||= { status: "draft", submittedBy: null, submittedAt: null, approvedBy: null, approvedAt: null, feedbackText: "" };

    const status = pair.reporting.status || "draft";
    const lockStructure = status !== "draft";
    const canEditStructure = auditor && obs.phase === "reporting" && !obs.reportingFinalApproved && !lockStructure;

    const isMgmt = rk.startsWith("MGMT");
    const mgmtInPair = pairVisibleToMgmt(pair, user.id);
    const canMgmtEdit = isMgmt && mgmtInPair && obs.phase === "reporting" && !obs.reportingFinalApproved && (status === "draft" || status === "feedback");
    const canAuditDecision = auditor && obs.phase === "reporting" && !obs.reportingFinalApproved && status === "submitted";

    const mgmtList = mgmtUsers(st);
    const typeOptions = ["for response", "for approval", "for information"];

    const audRows = (pair.auditees || []).map(a => `
      <div class="row g-2 align-items-center">
        <div class="col-md-6">
          <select class="form-select form-select-sm" ${canEditStructure ? "" : "disabled"} data-act="rep-aud-user" data-obs="${obs.id}" data-pair="${pair.id}" data-aud="${a.id}">
            ${mgmtList.map(mu => `<option value="${mu.id}" ${Number(mu.id) === Number(a.userId) ? "selected" : ""}>${esc(mu.name)}</option>`).join("")}
          </select>
        </div>
        <div class="col-md-5">
          <select class="form-select form-select-sm" ${canEditStructure ? "" : "disabled"} data-act="rep-aud-type" data-obs="${obs.id}" data-pair="${pair.id}" data-aud="${a.id}">
            ${typeOptions.map(t => `<option value="${t}" ${t === a.type ? "selected" : ""}>${esc(t)}</option>`).join("")}
          </select>
        </div>
        <div class="col-md-1 text-end">
          ${canEditStructure ? `<button class="btn btn-sm btn-outline-danger" data-act="rep-aud-remove" data-obs="${obs.id}" data-pair="${pair.id}" data-aud="${a.id}"><i class="fa fa-times"></i></button>` : ""}
        </div>
      </div>`).join("") || `<div class="help-note">No auditees yet.</div>`;

    const subBy = pair.reporting.submittedBy ? getUser(st, pair.reporting.submittedBy) : null;
    const apBy = pair.reporting.approvedBy ? getUser(st, pair.reporting.approvedBy) : null;

    const mgmtSubmitDisabled = (!pair.mgmtComment || !pair.implementationDate) ? "disabled" : "";

    return `
      <div class="rec-card">
        <div class="rec-header">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <div class="rec-title">Pair #${index + 1}</div>
            ${statusBadge(status)}
            <span class="text-muted small">ID: ${pair.id}</span>
          </div>
          <div class="d-flex gap-2">
            ${canEditStructure ? `<button class="btn btn-sm btn-outline-danger" data-act="rep-pair-remove" data-obs="${obs.id}" data-pair="${pair.id}"><i class="fa fa-trash me-1"></i>Remove</button>` : ""}
          </div>
        </div>

        ${status === "feedback" && pair.reporting.feedbackText ? `<div class="feedback-box mt-2"><b>Feedback:</b> ${esc(pair.reporting.feedbackText)}</div>` : ""}

        <div class="mt-2">
          <label>Recommended Action Step</label>
          <textarea class="form-control form-control-sm" rows="3" data-act="rep-rec-text" data-obs="${obs.id}" data-pair="${pair.id}" ${canEditStructure ? "" : "disabled"}>${esc(pair.recText || "")}</textarea>
          <div class="help-note mt-1">Locked after first submission.</div>
        </div>

        <div class="divider-soft"></div>

        <div class="d-flex justify-content-between align-items-center">
          <div class="fw-bold">Management Auditees (unique)</div>
          ${canEditStructure ? `<button class="btn btn-sm btn-outline-primary" data-act="rep-aud-add" data-obs="${obs.id}" data-pair="${pair.id}"><i class="fa fa-user-plus me-1"></i>Add Auditee</button>` : ""}
        </div>
        <div class="help-note mt-1">Selector shows only Management Auditee users. Duplicate users are not allowed in one pair (type can repeat).</div>

        <div class="mt-2 d-grid gap-2">${audRows}</div>

        <div class="divider-soft"></div>

        <div class="mt-2">
          <label>Management Comments (single field)</label>
          <textarea class="form-control form-control-sm" rows="3" data-act="rep-mgmt" data-obs="${obs.id}" data-pair="${pair.id}" ${canMgmtEdit ? "" : "disabled"}>${esc(pair.mgmtComment || "")}</textarea>
        </div>

        <div class="mt-3">
          <label>Implementation Date</label>
          <input type="text" data-datepicker="1"
 class="form-control form-control-sm" value="${esc(fmtDate(pair.implementationDate || ""))}" data-act="rep-impl-date" data-obs="${obs.id}" data-pair="${pair.id}" ${canMgmtEdit ? "" : "disabled"} />
        </div>

        <div class="mt-2 help-note">
          <div><b>Reporting Submitted By:</b> ${subBy ? esc(subBy.name) : "—"} • <b>At:</b> ${esc(pair.reporting.submittedAt || "—")}</div>
          <div><b>Reporting Approved By:</b> ${apBy ? esc(apBy.name) : "—"} • <b>At:</b> ${esc(pair.reporting.approvedAt || "—")}</div>
        </div>

        ${canMgmtEdit ? `
          <div class="d-flex justify-content-end mt-3">
            <button class="btn btn-primary btn-sm" id="rep-submit-${obs.id}-${pair.id}"
 data-act="rep-submit" data-obs="${obs.id}" data-pair="${pair.id}"><i class="fa fa-paper-plane me-1"></i>Submit</button>
          </div>` : ""}

        ${canAuditDecision ? `
          <div class="d-flex justify-content-end gap-2 mt-3">
            <button class="btn btn-primary btn-sm" data-act="rep-approve" data-obs="${obs.id}" data-pair="${pair.id}"><i class="fa fa-check me-1"></i>Approve</button>
            <button class="btn btn-primary btn-sm" data-act="rep-feedback" data-obs="${obs.id}" data-pair="${pair.id}">FeedBack</button>
          </div>` : ""}
      </div>`;
  }

  // ----- Follow-up Particulars -----
  function mountFollowupParticulars(st) {
    const root = document.getElementById("page-root");
    const eng = st.engagements.find(e => Number(e.id) === getEngId(st)) || st.engagements[0];
    const { rk, user } = getCurrentUser(st);
    const auditor = isAuditor(eng, user.id);

    const obsList = (eng.reportingList || []).filter(o => o.phase !== "reporting");

    const obsHtml = obsList.map(obs => {
      const pairs = obs.pairs || [];
      const done = pairs.filter(p => (p.followup?.status || "draft") === "approved_final").length;
      const total = pairs.length;

      const visiblePairs = pairs.filter(p => rk.startsWith("MGMT") ? pairVisibleToMgmt(p, user.id) : true);
      const pairsHtml = visiblePairs.map((p, i) => renderFollowupPair(st, eng, obs, p, i)).join("") || `<div class="help-note">No pairs.</div>`;

      const canFinalApprove = auditor && total > 0 && done === total && !obs.followupFinalApproved;

      return `
        <div class="accordion-item">
          <h2 class="accordion-header" id="hf-${obs.id}">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#cf-${obs.id}">
              <div class="d-flex w-100 justify-content-between align-items-center">
                <div><b>${esc(obs.observationTitle)}</b> — Step ${obs.stepNo} — Follow-up</div>
                <span class="badge badge-step">${done}/${total} pairs completed</span>
              </div>
            </button>
          </h2>
          <div id="cf-${obs.id}" class="accordion-collapse collapse" data-bs-parent="#accfu">
            <div class="accordion-body">
              <div class="mt-2">${richMock("Observation", obs.observationName)}</div>
              <hr class="my-4" />
              <div class="sub-heading">Follow-up (per Pair)</div>
              <div class="help-note mb-3">Reporting fields locked. New fields: Implemented (default Yes), Comments, Next date (only if No).</div>
              <div class="d-grid gap-3">${pairsHtml}</div>

              ${canFinalApprove ? `
                <div class="divider-soft"></div>
                <div class="text-end">
                  <button class="btn btn-primary" data-act="fu-final-approve" data-obs="${obs.id}"><i class="fa fa-check me-2"></i>Final Approve Observation</button>
                </div>` : (obs.followupFinalApproved ? `<div class="divider-soft"></div><div class="text-end"><span class="badge bg-success">Follow-up approved • Completed</span></div>` : "")}
            </div>
          </div>
        </div>`;
    }).join("");

    root.innerHTML = `
      <header class="my-3 d-flex align-items-center">
        <a href="#" class="text-primary me-3" data-act="nav-followup"><i class="fa fa-arrow-left"></i></a>
        <div class="heading">Follow Up</div>
      </header>
      <div class="card-like p-3">
        <div class="sub-heading mb-2">${esc(eng.title)}</div>
        <div class="help-note mb-3">Only observations moved from Reporting appear here.</div>
        <div class="accordion" id="accfu">${obsHtml || `<div class="help-note">No observations in Follow-up yet. Final approve in Reporting first.</div>`}</div>
      </div>
    `;
  }

  function renderFollowupPair(st, eng, obs, pair, index) {
    const { rk, user } = getCurrentUser(st);
    const auditor = isAuditor(eng, user.id);

    pair.followup ||= { status: "draft", recommendationsImplemented: "true", comments: "", nextImplementationDate: "", submittedBy: null, submittedAt: null, approvedBy: null, approvedAt: null, feedbackText: "" };
    const fu = pair.followup;
    const status = fu.status || "draft";

    const isMgmt = rk.startsWith("MGMT");
    const mgmtInPair = pairVisibleToMgmt(pair, user.id);
    const canMgmtEdit = isMgmt && mgmtInPair && !obs.followupFinalApproved && (status === "draft" || status === "feedback" || status === "reopened");
    const canAuditDecision = auditor && !obs.followupFinalApproved && status === "submitted";

    const implemented = (fu.recommendationsImplemented ?? "true").toString();
    const showNext = implemented === "false";

    const subBy = fu.submittedBy ? getUser(st, fu.submittedBy) : null;
    const apBy = fu.approvedBy ? getUser(st, fu.approvedBy) : null;

    const submitDisabled = (!fu.comments || (showNext && !fu.nextImplementationDate)) ? "disabled" : "";

    return `
      <div class="rec-card">
        <div class="rec-header">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <div class="rec-title">Pair #${index + 1}</div>
            ${statusBadge(status)}
            <span class="text-muted small">ID: ${pair.id}</span>
          </div>
        </div>

        ${(status === "feedback" || status === "reopened") && fu.feedbackText ? `<div class="feedback-box mt-2"><b>Feedback:</b> ${esc(fu.feedbackText)}</div>` : ""}

        <div class="mt-2">
          <label>Recommended Action Step (locked)</label>
          <textarea class="form-control form-control-sm" rows="2" disabled>${esc(pair.recText || "")}</textarea>
        </div>

        <div class="mt-3">
          <label>Management Auditees (locked)</label>
          <div class="mt-1">
            ${(pair.auditees || []).map(a => {
      const u = getUser(st, a.userId);
      return `<span class="chip">${esc(u ? u.name : ("User#" + a.userId))}</span><span class="chip">${esc(a.type)}</span>`;
    }).join(" ") || `<span class="chip">—</span>`}
          </div>
        </div>

        <div class="mt-3">
          <label>Management Comments (locked)</label>
          <textarea class="form-control form-control-sm" rows="2" disabled>${esc(pair.mgmtComment || "")}</textarea>
        </div>

        <div class="mt-3">
          <label>Implementation Date (locked)</label>
          <input type="text"  data-datepicker="1"
 class="form-control form-control-sm" value="${esc(fmtDate(pair.implementationDate || ""))}" disabled />
        </div>

        <div class="divider-soft"></div>

        <div class="mt-2">
          <label>Recommendations Implemented</label>
          <select class="form-select form-select-sm" data-act="fu-implemented" data-obs="${obs.id}" data-pair="${pair.id}" ${canMgmtEdit ? "" : "disabled"}>
            <option value="true" ${implemented === "true" ? "selected" : ""}>Yes</option>
            <option value="false" ${implemented === "false" ? "selected" : ""}>No</option>
          </select>
        </div>

        <div class="mt-3">
          <label>Comments</label>
          <textarea class="form-control form-control-sm" rows="3" data-act="fu-comments" data-obs="${obs.id}" data-pair="${pair.id}" ${canMgmtEdit ? "" : "disabled"}>${esc(fu.comments || "")}</textarea>
        </div>

        ${showNext ? `
          <div class="mt-3">
            <label>Next Implementation Date</label>
            <input type="text" data-datepicker="1"
 class="form-control form-control-sm" data-act="fu-nextdate" data-obs="${obs.id}" data-pair="${pair.id}" value="${esc(fmtDate(fu.nextImplementationDate || ""))}" ${canMgmtEdit ? "" : "disabled"} />
          </div>` : ""}

        <div class="mt-2 help-note">
          <div><b>Follow-up Submitted By:</b> ${subBy ? esc(subBy.name) : "—"} • <b>At:</b> ${esc(fu.submittedAt || "—")}</div>
          <div><b>Follow-up Approved By:</b> ${apBy ? esc(apBy.name) : "—"} • <b>At:</b> ${esc(fu.approvedAt || "—")}</div>
        </div>

        ${canMgmtEdit ? `<div class="text-end mt-3">
          <button class="btn btn-primary btn-sm" data-act="fu-submit" data-obs="${obs.id}" data-pair="${pair.id}"><i class="fa fa-paper-plane me-1"></i>Submit</button>
        </div>`: ""}

        ${canAuditDecision ? `<div class="text-end mt-3 d-flex justify-content-end gap-2">
          <button class="btn btn-primary btn-sm" data-act="fu-approve" data-obs="${obs.id}" data-pair="${pair.id}"><i class="fa fa-check me-1"></i>Approve</button>
          <button class="btn btn-primary btn-sm" data-act="fu-feedback" data-obs="${obs.id}" data-pair="${pair.id}">FeedBack</button>
        </div>`: ""}
      </div>`;
  }

  // ---------- actions ----------
  function findObs(eng, obsId) { return (eng.reportingList || []).find(o => Number(o.id) === Number(obsId)); }
  function findPair(obs, pairId) { return (obs.pairs || []).find(p => Number(p.id) === Number(pairId)); }

  function preserveOpenAccordions() {
    return Array.from(document.querySelectorAll(".accordion-collapse.show")).map(n => n.id);
  }
  function restoreOpenAccordions(ids) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      bootstrap.Collapse.getOrCreateInstance(el, { toggle: false }).show();
    });
  }

  function initDatePickers(root = document) {
    root.querySelectorAll("input[data-datepicker='1']").forEach(inp => {
      if (inp._flatpickr) return;
      flatpickr(inp, {
        dateFormat: "Y-m-d",
        allowInput: true
      });
    });
  }


  function renderTop() {
    const st = load();
    mountHeader(st);
    mountSidebar(getView());
    const v = getView();
    if (v === "reporting-list") mountReportingList(st);
    else if (v === "reporting-particulars") mountReportingParticulars(st);
    else if (v === "followup-list") mountFollowupList(st);
    else mountFollowupParticulars(st);
    window.scrollTo({ top: 0 });
    wireEvents();
    initDatePickers()
    initDatePickers(document.getElementById("page-root"));
  }

  function renderPreserve() {
    const open = preserveOpenAccordions();
    const y = window.scrollY;
    const st = load();
    mountHeader(st);
    mountSidebar(getView());
    const v = getView();
    if (v === "reporting-list") mountReportingList(st);
    else if (v === "reporting-particulars") mountReportingParticulars(st);
    else if (v === "followup-list") mountFollowupList(st);
    else mountFollowupParticulars(st);
    wireEvents();
    initDatePickers()
    initDatePickers(document.getElementById("page-root"));
    restoreOpenAccordions(open);
    window.scrollTo({ top: y });
  }

  function wireEvents() {
    const root = document.getElementById("page-root");
    if (!root) return;

    // nav
    root.querySelector("[data-act='nav-reporting']")?.addEventListener("click", (e) => { e.preventDefault(); setView("reporting-list"); renderTop(); });
    root.querySelector("[data-act='nav-followup']")?.addEventListener("click", (e) => { e.preventDefault(); setView("followup-list"); renderTop(); });

    // delegate clicks
    root.onclick = (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      e.preventDefault();

      const act = btn.getAttribute("data-act");
      const obsId = Number(btn.getAttribute("data-obs"));
      const pairId = Number(btn.getAttribute("data-pair"));
      const audId = Number(btn.getAttribute("data-aud"));

      const st = load();
      const eng = st.engagements.find(x => Number(x.id) === getEngId(st)) || st.engagements[0];

      if (act === "rep-add-pair") {
        const obs = findObs(eng, obsId);
        obs.pairs ||= [];
        obs.pairs.push({
          id: uid(),
          recText: "",
          auditees: [],
          mgmtComment: "",
          implementationDate: "",
          reporting: { status: "draft", submittedBy: null, submittedAt: null, approvedBy: null, approvedAt: null, feedbackText: "" },
          followup: { status: "draft", recommendationsImplemented: "true", comments: "", nextImplementationDate: "", submittedBy: null, submittedAt: null, approvedBy: null, approvedAt: null, feedbackText: "" }
        });
        save(st); renderPreserve(); return;
      }

      if (act === "rep-pair-remove") {
        const obs = findObs(eng, obsId); obs.pairs = (obs.pairs || []).filter(p => Number(p.id) !== Number(pairId));
        save(st); renderPreserve(); return;
      }

      if (act === "rep-aud-add") {
        const obs = findObs(eng, obsId); const pair = findPair(obs, pairId);
        pair.auditees ||= [];
        const used = new Set(pair.auditees.map(a => Number(a.userId)));
        const cand = mgmtUsers(st).find(u => !used.has(Number(u.id)));
        if (!cand) { alert("No more unique management auditees available for this pair."); return; }
        pair.auditees.push({ id: uid(), userId: cand.id, type: "for response" });
        save(st); renderPreserve(); return;
      }

      if (act === "rep-aud-remove") {
        const obs = findObs(eng, obsId); const pair = findPair(obs, pairId);
        pair.auditees = (pair.auditees || []).filter(a => Number(a.id) !== Number(audId));
        save(st); renderPreserve(); return;
      }

      if (act === "rep-submit") {
        const { user } = getCurrentUser(st);
        const obs = findObs(eng, obsId); const pair = findPair(obs, pairId);
        pair.reporting.status = "submitted";
        pair.reporting.submittedBy = user.id;
        pair.reporting.submittedAt = nowISO();
        save(st); renderPreserve(); return;
      }

      if (act === "rep-approve") {
        const { user } = getCurrentUser(st);
        const obs = findObs(eng, obsId); const pair = findPair(obs, pairId);
        pair.reporting.status = "approved";
        pair.reporting.approvedBy = user.id;
        pair.reporting.approvedAt = nowISO();
        save(st); renderPreserve(); return;
      }

      if (act === "rep-feedback") {
        const txt = prompt("Enter feedback (pair will reopen for management):");
        if (!txt) return;
        const obs = findObs(eng, obsId); const pair = findPair(obs, pairId);
        pair.reporting.status = "feedback";
        pair.reporting.feedbackText = txt;
        save(st); renderPreserve(); return;
      }

      if (act === "rep-final-approve") {
        const { user } = getCurrentUser(st);
        const obs = findObs(eng, obsId);
        obs.reportingFinalApproved = true;
        obs.reportingFinalApprovedBy = user.id;
        obs.reportingFinalApprovedAt = nowISO();
        obs.phase = "followup";
        obs.stepNo = 5;
        save(st); renderPreserve(); return;
      }

      // follow-up
      if (act === "fu-submit") {
        const { user } = getCurrentUser(st);
        const obs = findObs(eng, obsId); const pair = findPair(obs, pairId);
        pair.followup.status = "submitted";
        pair.followup.submittedBy = user.id;
        pair.followup.submittedAt = nowISO();
        save(st); renderPreserve(); return;
      }

      if (act === "fu-approve") {
        const { user } = getCurrentUser(st);
        const obs = findObs(eng, obsId); const pair = findPair(obs, pairId);
        pair.followup.approvedBy = user.id;
        pair.followup.approvedAt = nowISO();
        // approve logic: if implemented NO -> reopen, else complete final
        if ((pair.followup.recommendationsImplemented || "true").toString() === "false") {
          pair.followup.status = "reopened";
        } else {
          pair.followup.status = "approved_final";
        }
        save(st); renderPreserve(); return;
      }

      if (act === "fu-feedback") {
        const txt = prompt("Enter feedback (pair will reopen for management):");
        if (!txt) return;
        const obs = findObs(eng, obsId); const pair = findPair(obs, pairId);
        pair.followup.status = "feedback";
        pair.followup.feedbackText = txt;
        save(st); renderPreserve(); return;
      }

      if (act === "fu-final-approve") {
        const { user } = getCurrentUser(st);
        const obs = findObs(eng, obsId);
        obs.followupFinalApproved = true;
        obs.followupFinalApprovedBy = user.id;
        obs.followupFinalApprovedAt = nowISO();
        obs.phase = "completed";
        obs.stepNo = 7;
        save(st); renderPreserve(); return;
      }
    };

    // delegate input/change for data binding
    root.oninput = (e) => {
      const el = e.target.closest("[data-act]");
      if (!el) return;
      const act = el.getAttribute("data-act");
      const obsId = Number(el.getAttribute("data-obs"));
      const pairId = Number(el.getAttribute("data-pair"));

      const st = load();
      const eng = st.engagements.find(x => Number(x.id) === getEngId(st)) || st.engagements[0];
      const obs = findObs(eng, obsId); if (!obs) return;
      const pair = findPair(obs, pairId); if (!pair) return;

      if (act === "rep-rec-text") { pair.recText = el.value; save(st); }
      if (act === "rep-mgmt") { pair.mgmtComment = el.value; save(st); }
      if (act === "rep-mgmt") {
        pair.mgmtComment = el.value;
        save(st);
        updateReportingSubmitButton(obsId, pairId);
      }
      if (act === "fu-comments") { pair.followup.comments = el.value; save(st); }
    };

    root.onchange = (e) => {
      const el = e.target.closest("[data-act]");
      if (!el) return;
      const act = el.getAttribute("data-act");
      const obsId = Number(el.getAttribute("data-obs"));
      const pairId = Number(el.getAttribute("data-pair"));
      const audId = Number(el.getAttribute("data-aud"));

      const st = load();
      const eng = st.engagements.find(x => Number(x.id) === getEngId(st)) || st.engagements[0];
      const obs = findObs(eng, obsId); if (!obs) return;
      const pair = findPair(obs, pairId); if (!pair) return;

      if (act === "rep-aud-user") {
        const aud = (pair.auditees || []).find(a => Number(a.id) === Number(audId));
        if (!aud) return;
        const newId = Number(el.value);
        const dup = (pair.auditees || []).some(a => Number(a.id) !== Number(audId) && Number(a.userId) === newId);
        if (dup) { alert("Duplicate management auditee is not allowed in the same pair."); renderPreserve(); return; }
        aud.userId = newId; save(st); return;
      }
      if (act === "rep-aud-type") {
        const aud = (pair.auditees || []).find(a => Number(a.id) === Number(audId));
        if (!aud) return;
        aud.type = el.value; save(st); return;
      }
      if (act === "rep-impl-date") {
        pair.implementationDate = el.value;
        save(st);
        updateReportingSubmitButton(obsId, pairId);
        return;
      }


      if (act === "fu-implemented") {
        pair.followup.recommendationsImplemented = el.value;
        if (el.value === "true") { pair.followup.nextImplementationDate = ""; }
        save(st);
        renderPreserve(); // show/hide next date
        return;
      }
      if (act === "fu-nextdate") { pair.followup.nextImplementationDate = el.value; save(st); return; }
    };
  }

  // ---------- public reset ----------
  window.__abilityReset = () => { sessionStorage.removeItem(STORAGE_KEY); renderTop(); };

  document.addEventListener("DOMContentLoaded", () => renderTop());
})();