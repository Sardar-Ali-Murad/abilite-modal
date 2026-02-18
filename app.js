/* Ability - Reporting & Follow-up Model (static) */
(function () {
  const STORAGE_KEY = "ability_model_state_v1";
  const ROLE_KEY = "ability_model_role_v1";

  const ROLE_OPTIONS = [
    { key: "IAH", label: "IAH (Internal Audit Head)", userId: 41 },
    { key: "RESOURCE", label: "Resource (Audit Executive)", userId: 98 },
    { key: "APPROVER", label: "Proposed Job Approver", userId: 98 },
    { key: "BACKUP_IAH", label: "Backup Head of Internal Audit", userId: 98 },
    { key: "MGMT", label: "Management Auditee", userId: 43 },
  ];

  const DEFAULT_DATA = {
    users: [
      { id: 41, name: "IAH", hierarchy: "IAH" },
      { id: 98, name: "Sardar Ali", hierarchy: "Audit_Executive_2" },
      { id: 42, name: "Team Lead", hierarchy: "Team_Lead" },
      { id: 43, name: "Management Auditee", hierarchy: "Management_Auditee" },
    ],
    subLocationList: [
      { id: 1262, description: "Dubai", location: "United Arab Emirates" },
    ],
    company: "Murad Care",
    year: 2026,
    engagements: [
      {
        id: 21,
        title: "1. Checklist",
        riskApproach: "Checklist",
        plannedStartDate: "2026-02-04",
        plannedEndDate: "2026-02-18",
        resourceAllocation: {
          headOfInternalAudit: 41,
          backupHeadOfInternalAudit: 98,
          proposedJobApprover: 98,
          resourcesList: [98, 42],
        },
        reportingList: [
          {
            id: 4,
            observationTitle: "1. area",
            observationName: "<p>1. area</p>",
            area: "1. area",
            stepNo: 1,
            subLocation: 1262,
            implicationRating: 1,
            implication: "Implication text...",
            managementComments: "<p></p>",
            implementationDate: "2026-02-27",
            auditeeId: 43,
            recommendations: [
              {
                id: 1001,
                text: "Recommended Action Step #1 (sample)",
                auditees: [
                  { id: 9001, userId: 43, type: "for response" },
                  { id: 9002, userId: 42, type: "for information" },
                ],
                mgmtComment: "",
                status: "draft",
                submittedAt: null,
                approvedAt: null,
                followup: {
                  recommendationsImplemented: "",
                  finalComments: "",
                  nextImplementationDate: "",
                  testInNextYear: "",
                },
              },
            ],
            thirdFeedback: null,
          },
          {
            id: 5,
            observationTitle: "2. area",
            observationName: "<p>2. area</p>",
            area: "2. area",
            stepNo: 5,
            subLocation: 1262,
            implicationRating: 2,
            implication: "Implication text...",
            managementComments: "<p>Management provided comments.</p>",
            implementationDate: "2026-03-04",
            auditeeId: 43,
            recommendations: [
              {
                id: 1002,
                text: "Recommended Action Step #1 for Follow-up (sample)",
                auditees: [{ id: 9010, userId: 43, type: "for response" }],
                mgmtComment: "We will implement by next month.",
                status: "approved",
                submittedAt: "2026-02-10",
                approvedAt: "2026-02-12",
                followup: {
                  recommendationsImplemented: "false",
                  finalComments: "Delays due to vendor dependency.",
                  nextImplementationDate: "2026-04-10",
                  testInNextYear: "",
                },
              },
            ],
            thirdFeedback: { description: "Please verify evidence before closing." },
          },
        ],
      },
    ],
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_DATA);
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.engagements) return structuredClone(DEFAULT_DATA);
      return parsed;
    } catch {
      return structuredClone(DEFAULT_DATA);
    }
  }

  function getOpenAccordionIds(rootEl) {
    if (!rootEl) return [];
    return Array.from(rootEl.querySelectorAll(".accordion-collapse.show"))
      .map(el => el.id)
      .filter(Boolean);
  }

  function restoreOpenAccordions(openIds) {
    openIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      // Re-open without toggling others
      const c = bootstrap.Collapse.getOrCreateInstance(el, { toggle: false });
      c.show();
    });
  }


  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getRoleKey() {
    return localStorage.getItem(ROLE_KEY) || "RESOURCE";
  }

  function setRoleKey(k) {
    localStorage.setItem(ROLE_KEY, k);
  }

  function getCurrentUser(state) {
    const roleKey = getRoleKey();
    const role = ROLE_OPTIONS.find(r => r.key === roleKey) || ROLE_OPTIONS[1];
    const user = state.users.find(u => u.id === role.userId) || state.users[0];
    return { roleKey, role, user };
  }

  function isApproverForStep6(state, engagement, userId) {
    const ra = engagement.resourceAllocation || {};
    return (
      userId === ra.headOfInternalAudit ||
      userId === ra.backupHeadOfInternalAudit ||
      userId === ra.proposedJobApprover ||
      (ra.resourcesList || []).includes(userId)
    );
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function stripHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    return tmp.textContent || tmp.innerText || "";
  }

  function formatDate(d) {
    if (!d) return "";
    return String(d).slice(0, 10);
  }

  function unique(arr) {
    return [...new Set(arr)];
  }

  function qs() {
    const p = new URLSearchParams(location.search);
    return Object.fromEntries(p.entries());
  }

  function mountHeader(state) {
    const el = document.getElementById("model-header");
    if (!el) return;

    const { roleKey, role, user } = getCurrentUser(state);

    el.innerHTML = `
      <div class="topbar py-2">
        <div class="page-wrap d-flex align-items-center justify-content-between gap-3">
          <div class="brand-badge">
            <i class="fa fa-shield"></i>
            <span>Ability • Prototype</span>
            <span class="badge badge-step ms-2">${escapeHtml(state.company)} • ${escapeHtml(state.year)}</span>
          </div>

          <div class="d-flex align-items-center gap-2">
            <span class="badge role-pill">${escapeHtml(user.name)} • ${escapeHtml(role.label)}</span>
            <select id="roleSelect" class="form-select form-select-sm" style="min-width:280px;">
              ${ROLE_OPTIONS.map(r => `<option value="${r.key}" ${r.key === roleKey ? "selected" : ""}>${escapeHtml(r.label)}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>
    `;

    el.querySelector("#roleSelect").addEventListener("change", (e) => {
      setRoleKey(e.target.value);
      location.reload();
    });
  }

  function mountSidebar(active) {
    const el = document.getElementById("model-sidebar");
    if (!el) return;

    el.innerHTML = `
      <div class="sidebar-mock">
        <div class="d-flex align-items-center gap-2 mb-2">
          <i class="fa fa-bars"></i>
          <div style="font-weight:700;">Menu</div>
        </div>

        <div class="group-title">Reporting & Followup</div>
        <a href="reporting-list.html" class="${active === 'reporting-list' ? "active" : ""}"><i class="fa fa-file-text-o me-2"></i>Reporting</a>
        <a href="followup-list.html" class="${active === 'followup-list' ? "active" : ""}"><i class="fa fa-check-square-o me-2"></i>Follow Up</a>

        <div class="mt-3 help-note">
          <div><b>Tip:</b> use the role dropdown at top to simulate different user hierarchies.</div>
        </div>
      </div>
    `;
  }

  function calcReportingStatus(state, engagement) {
    const list = engagement.reportingList || [];
    if (list.some(r => [0, 1].includes(Number(r.stepNo)))) return "Exceptions To Be Sent To Management For Comments";
    if (list.some(r => Number(r.stepNo) === 2)) return "Awaiting Management Comments";
    if (list.some(r => Number(r.stepNo) === 3)) {
      const { user } = getCurrentUser(state);
      return user.hierarchy === "Management_Auditee" ? "Management Comments Sent" : "Management Comments Received";
    }
    return "Exception To Be Implemented";
  }

  function calcFollowUpStatus(engagement) {
    const list = engagement.reportingList || [];
    if (list.some(r => Number(r.stepNo) === 5)) return "Exception To Be Implemented";
    if (list.some(r => Number(r.stepNo) === 6)) return "Exceptions Implemented";
    return "Observation Completed";
  }

  function renderChips(values) {
    return values.map(v => `<span class="chip">${escapeHtml(v)}</span>`).join(" ");
  }

  function mountReportingList(state) {
    const el = document.getElementById("page-root");
    if (!el) return;

    const rows = state.engagements.map((e, idx) => {
      const locations = unique(state.subLocationList.map(s => s.location));
      const subLocs = unique(state.subLocationList.map(s => s.description));
      const status = calcReportingStatus(state, e);

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><a href="reporting-particulars.html?id=${e.id}" class="text-primary fw-bold f-12">${escapeHtml(e.title)}</a></td>
          <td>${escapeHtml(status)}</td>
          <td>${(e.reportingList || []).length}</td>
          <td>${renderChips(locations)}</td>
          <td>${renderChips(subLocs)}</td>
          <td>${renderChips(["—"])}</td>
          <td>${renderChips(["—"])}</td>
          <td><a href="reporting-particulars.html?id=${e.id}" class="text-decoration-none"><i class="fa fa-eye f-18 cursor-pointer"></i></a></td>
        </tr>
      `;
    }).join("");

    el.innerHTML = `
      <header class="section-header my-3 text-start d-flex align-items-center justify-content-between">
        <div class="mb-0 heading">Reporting</div>
      </header>

      <div class="card-like p-3">
        <div class="table-responsive">
          <table class="table table-bordered table-hover rounded mb-0">
            <thead>
              <tr>
                <th class="sr-col">Sr. #</th>
                <th>Particulars</th>
                <th>Status</th>
                <th>No. of Observations</th>
                <th>Location</th>
                <th>Sub Location</th>
                <th>Department</th>
                <th>Sub Department</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3">
          <div class="help-note">Static model • pagination omitted</div>
          <div class="d-flex align-items-center gap-2">
            <label class="small-label mb-0">Items per page</label>
            <select class="form-select form-select-sm" style="width:110px" disabled>
              <option>5</option><option>10</option><option>20</option><option>30</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  function mountFollowUpList(state) {
    const el = document.getElementById("page-root");
    if (!el) return;

    const rows = state.engagements.map((e, idx) => {
      const locations = unique(state.subLocationList.map(s => s.location));
      const subLocs = unique(state.subLocationList.map(s => s.description));
      const status = calcFollowUpStatus(e);

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><a href="followup-particulars.html?id=${e.id}" class="text-primary fw-bold f-12">${escapeHtml(e.title)}</a></td>
          <td>${escapeHtml(status)}</td>
          <td>${(e.reportingList || []).filter(x => Number(x.stepNo) >= 5).length}</td>
          <td>${renderChips(locations)}</td>
          <td>${renderChips(subLocs)}</td>
          <td>${renderChips(["—"])}</td>
          <td>${renderChips(["—"])}</td>
          <td><a href="followup-particulars.html?id=${e.id}" class="text-decoration-none"><i class="fa fa-eye f-18 cursor-pointer"></i></a></td>
        </tr>
      `;
    }).join("");

    el.innerHTML = `
      <header class="section-header my-3 text-start d-flex align-items-center justify-content-between">
        <div class="mb-0 heading">Follow Up</div>
      </header>

      <div class="card-like p-3">
        <div class="table-responsive">
          <table class="table table-bordered table-hover rounded mb-0">
            <thead>
              <tr>
                <th class="sr-col">Sr. #</th>
                <th>Particulars</th>
                <th>Status</th>
                <th>No. of Observations</th>
                <th>Location</th>
                <th>Sub Location</th>
                <th>Department</th>
                <th>Sub Department</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3">
          <div class="help-note">Static model • pagination omitted</div>
          <div class="d-flex align-items-center gap-2">
            <label class="small-label mb-0">Items per page</label>
            <select class="form-select form-select-sm" style="width:110px" disabled>
              <option>5</option><option>10</option><option>20</option><option>30</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  function stepLabelReporting(stepNo) {
    const n = Number(stepNo);
    if (n === 0) return "Draft";
    if (n === 1) return "Exceptions To Be Sent To Management For Comments";
    if (n === 2) return "Awaiting Management Comments";
    if (n === 3) return "Management Comments Received";
    if (n >= 4) return "Exception To Be Implemented";
    return "—";
  }

  function stepLabelFollowUp(stepNo) {
    const n = Number(stepNo);
    if (n === 5) return "Exception To Be Implemented";
    if (n === 6) return "Exceptions Implemented";
    if (n >= 7) return "Observation Completed";
    return "—";
  }

  function getSubLocationLabel(state, id) {
    return (state.subLocationList.find(s => Number(s.id) === Number(id)) || {}).description || "—";
  }

  function getUser(state, id) {
    return state.users.find(u => Number(u.id) === Number(id));
  }

  function roleCanEditRecommendations(roleKey) {
    return roleKey !== "MGMT";
  }

  function recommendationVisibilityForMgmt(rec, userId) {
    return (rec.auditees || []).some(a => Number(a.userId) === Number(userId));
  }

  function renderRichMock(label, htmlValue, editable, onInputAttr) {
    return `
      <label>${escapeHtml(label)}</label>
      <div class="rich-mock">
        <div class="rich-toolbar">
          <span><i class="fa fa-bold"></i></span>
          <span><i class="fa fa-italic"></i></span>
          <span><i class="fa fa-list-ul"></i></span>
          <span><i class="fa fa-table"></i></span>
          <span><i class="fa fa-picture-o"></i></span>
          <span class="ms-auto small-label">${editable ? "editable" : "readonly"}</span>
        </div>
        <div class="rich-area" ${editable ? `contenteditable="true" ${onInputAttr}` : ""}>${escapeHtml(stripHtml(htmlValue))}</div>
      </div>
    `;
  }

  function mountReportingParticulars(state) {
    const el = document.getElementById("page-root");
    if (!el) return;

    const { id } = qs();
    const engagement = state.engagements.find(e => String(e.id) === String(id)) || state.engagements[0];
    const { roleKey, user } = getCurrentUser(state);

    const obsHtml = (engagement.reportingList || []).map((obs, idx) => {
      const step = Number(obs.stepNo);
      const showCheck = step >= 4;
      const recs = obs.recommendations || [];

      const recApprovedCount = recs.filter(r => r.status === "approved").length;
      const recTotal = recs.length;

      const addRecBtn = roleCanEditRecommendations(roleKey)
        ? `<button class="btn btn-sm btn-outline-primary" data-action="add-rec" data-obs="${obs.id}">
             <i class="fa fa-plus me-1"></i> Add Recommendation
           </button>`
        : "";

      const recBlocks = recs
        .filter(r => roleKey !== "MGMT" ? true : recommendationVisibilityForMgmt(r, user.id))
        .map((r, rIdx) => renderRecommendationBlock({ state, engagement, obs, rec: r, recIndex: rIdx, mode: "reporting" }))
        .join("");

      return `
        <div class="accordion-item">
          <h2 class="accordion-header" id="h-${obs.id}">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
              data-bs-target="#c-${obs.id}" aria-expanded="false" aria-controls="c-${obs.id}">
              <div class="d-flex w-100 me-3 align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                  ${showCheck ? `<i class="fa fa-check-circle fs-4 text-success"></i>` : `<i class="fa fa-circle-o text-muted"></i>`}
                  <span>${escapeHtml(obs.observationTitle)} ----- ${escapeHtml(stepLabelReporting(step))}</span>
                </div>
                <span class="badge badge-step">${recApprovedCount}/${recTotal} recommendations approved</span>
              </div>
            </button>
          </h2>
          <div id="c-${obs.id}" class="accordion-collapse collapse" data-bs-parent="#accordionFlushExample">
            <div class="accordion-body">
              <div class="d-flex items-center mb-4 justify-content-between">
                <div class="flex-1" style="width:70%;">
                  <label>Observation Title:</label>
                  <input class="form-control w-100" type="text" value="${escapeHtml(obs.observationTitle)}" disabled />
                </div>
                <div class="flex-1 d-flex justify-content-end" style="width:30%;">
                  <span class="chip"><i class="fa fa-map-marker me-1"></i>${escapeHtml(getSubLocationLabel(state, obs.subLocation))}</span>
                </div>
              </div>

              <div class="d-flex items-center mb-4">
                <div class="flex-1 w-100">
                  <label>Area:</label>
                  <input class="form-control w-100" type="text" value="${escapeHtml(obs.area)}" disabled />
                </div>
              </div>

              <div class="mb-4">
                ${renderRichMock("Observation", obs.observationName, false, "")}
              </div>

              <hr class="my-4"/>

              <div class="d-flex align-items-center justify-content-between mb-2">
                <div>
                  <div class="sub-heading fw-bold">Recommendations</div>
                  <div class="help-note">Add multiple recommendations. Each recommendation can have multiple auditees with a type (for response / for approval / for information).</div>
                </div>
                ${addRecBtn}
              </div>

              <div class="d-grid gap-3" id="recs-${obs.id}">
                ${recBlocks || `<div class="help-note">No recommendations in this observation (use “Add Recommendation”).</div>`}
              </div>

              <div class="mt-3 help-note">
                Observation moves forward after <b>all</b> recommendations are submitted & approved (simulated).
              </div>

            </div>
          </div>
        </div>
      `;
    }).join("");

    el.innerHTML = `
      <header class="section-header my-3 align-items-center text-start d-flex">
        <a class="text-primary" href="reporting-list.html"><i class="fa fa-arrow-left text-primary fs-5 pe-3"></i></a>
        <div class="mb-0 heading">Reporting</div>
      </header>

      <div class="card-like p-3">
        <div class="sub-heading fw-bold mb-2">${escapeHtml(engagement.title)}</div>
        <div class="help-note mb-3">Role simulation: use the dropdown at the top. Changes persist in your browser (localStorage).</div>
        <div class="accordion" id="accordionFlushExample">${obsHtml}</div>
      </div>
    `;

    wireReportingActions(state, engagement);
  }

  function renderRecommendationBlock({ state, engagement, obs, rec, recIndex, mode }) {
    const { roleKey, user } = getCurrentUser(state);

    const isMgmt = roleKey === "MGMT";
    const isVisibleToMgmt = recommendationVisibilityForMgmt(rec, user.id);
    const canSee = !isMgmt || isVisibleToMgmt;
    if (!canSee) return "";

    const auditeeRows = (rec.auditees || []).map(a => {
      const allowEdit = roleCanEditRecommendations(roleKey);
      const typeOptions = ["for response", "for approval", "for information"];

      return `
        <div class="row g-2 align-items-center" data-audrow="${a.id}">
          <div class="col-md-6">
            <select class="form-select form-select-sm" ${allowEdit ? "" : "disabled"} data-action="auditee-user" data-obs="${obs.id}" data-rec="${rec.id}" data-aud="${a.id}">
              ${state.users.map(u2 => `<option value="${u2.id}" ${Number(u2.id) === Number(a.userId) ? "selected" : ""}>${escapeHtml(u2.name)} • ${escapeHtml(u2.hierarchy)}</option>`).join("")}
            </select>
          </div>
          <div class="col-md-5">
            <select class="form-select form-select-sm" ${allowEdit ? "" : "disabled"} data-action="auditee-type" data-obs="${obs.id}" data-rec="${rec.id}" data-aud="${a.id}">
              ${typeOptions.map(t => `<option value="${t}" ${t === a.type ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
            </select>
          </div>
          <div class="col-md-1 text-end">
            ${allowEdit ? `<button class="btn btn-sm btn-outline-danger" data-action="remove-aud" data-obs="${obs.id}" data-rec="${rec.id}" data-aud="${a.id}"><i class="fa fa-times"></i></button>` : ""}
          </div>
        </div>
      `;
    }).join("");

    const canEditText = roleCanEditRecommendations(roleKey);
    const textArea = `
      <label>Recommendation</label>
      <textarea class="form-control form-control-sm" data-action="rec-text" data-obs="${obs.id}" data-rec="${rec.id}" ${canEditText ? "" : "disabled"}>${escapeHtml(rec.text || "")}</textarea>
    `;

    const addAudBtn = canEditText ? `
      <button class="btn btn-sm btn-outline-primary" data-action="add-aud" data-obs="${obs.id}" data-rec="${rec.id}">
        <i class="fa fa-user-plus me-1"></i> Add Auditee
      </button>
    ` : "";

    const statusBadge =
      rec.status === "approved" ? `<span class="badge bg-success">Approved</span>` :
        rec.status === "submitted" ? `<span class="badge bg-warning text-dark">Submitted</span>` :
          `<span class="badge bg-secondary">Draft</span>`;

    let actionButtons = "";

    if (mode === "reporting") {
      if (roleKey === "MGMT") {
        const canSubmit = rec.status === "draft" || rec.status === "submitted";
        const disabled = canSubmit ? "" : "disabled";
        actionButtons = `
          <div class="rec-actions d-flex gap-2 justify-content-end">
            <button class="btn btn-primary btn-sm ${disabled}" data-action="rec-submit" data-obs="${obs.id}" data-rec="${rec.id}">
              <i class="fa fa-paper-plane me-1"></i> Submit
            </button>
          </div>
        `;
      } else {
        const disabled = rec.status === "submitted" ? "" : "disabled";
        actionButtons = `
          <div class="rec-actions d-flex gap-2 justify-content-end">
            <button class="btn btn-primary btn-sm ${disabled}" data-action="rec-approve" data-obs="${obs.id}" data-rec="${rec.id}">
              <i class="fa fa-check me-1"></i> Approve
            </button>
          </div>
        `;
      }
    }

    const mgmtCommentEditable = (roleKey === "MGMT") && (rec.status !== "approved");
    const mgmtCommentBox = `
      <div class="mt-2">
        ${renderRichMock("Management Comments", rec.mgmtComment || "", mgmtCommentEditable,
      `data-action="rec-mgmt" data-obs="${obs.id}" data-rec="${rec.id}"`)}
      </div>
    `;

    const removeRecBtn = canEditText ? `
      <button class="btn btn-sm btn-outline-danger" data-action="remove-rec" data-obs="${obs.id}" data-rec="${rec.id}">
        <i class="fa fa-trash me-1"></i> Remove
      </button>
    ` : "";

    return `
      <div class="rec-card" data-recblock="${rec.id}">
        <div class="rec-header">
          <div class="kv">
            <div class="rec-title">Recommendation #${recIndex + 1}</div>
            ${statusBadge}
            <span class="small-label">ID: ${rec.id}</span>
          </div>
          <div class="d-flex gap-2 align-items-center">
            ${removeRecBtn}
          </div>
        </div>

        <div class="mt-2">${textArea}</div>

        <div class="d-flex align-items-center justify-content-between mt-3">
          <div class="fw-bold">Auditees</div>
          ${addAudBtn}
        </div>

        <div class="d-grid gap-2 mt-2">
          ${auditeeRows || `<div class="help-note">No auditees yet (use “Add Auditee”).</div>`}
        </div>

        ${mgmtCommentBox}

        <div class="mt-3">${actionButtons}</div>
      </div>
    `;
  }

  function wireReportingActions(state, engagement) {
    const root = document.getElementById("page-root");
    if (!root) return;

    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.getAttribute("data-action");
      const obsId = Number(btn.getAttribute("data-obs"));
      const recId = Number(btn.getAttribute("data-rec"));
      const audId = Number(btn.getAttribute("data-aud"));

      const obs = engagement.reportingList.find(o => Number(o.id) === obsId);
      if (!obs) return;

      if (action === "add-rec") {
        const newId = Date.now();
        obs.recommendations = obs.recommendations || [];
        obs.recommendations.push({
          id: newId,
          text: "",
          auditees: [],
          mgmtComment: "",
          status: "draft",
          submittedAt: null,
          approvedAt: null,
          followup: { recommendationsImplemented: "", finalComments: "", nextImplementationDate: "", testInNextYear: "" }
        });
        saveAndReload(state);
      }

      if (!recId) return;
      const rec = (obs.recommendations || []).find(r => Number(r.id) === recId);
      if (!rec) return;

      if (action === "remove-rec") {
        obs.recommendations = (obs.recommendations || []).filter(r => Number(r.id) !== recId);
        saveAndReload(state);
      }

      if (action === "add-aud") {
        rec.auditees = rec.auditees || [];
        rec.auditees.push({ id: Date.now(), userId: 43, type: "for response" });
        saveAndReload(state);
      }

      if (action === "remove-aud") {
        rec.auditees = (rec.auditees || []).filter(a => Number(a.id) !== audId);
        saveAndReload(state);
      }

      if (action === "rec-submit") {
        rec.status = "submitted";
        rec.submittedAt = new Date().toISOString().slice(0, 10);
        saveAndReload(state);
      }

      if (action === "rec-approve") {
        rec.status = "approved";
        rec.approvedAt = new Date().toISOString().slice(0, 10);
        saveAndReload(state);
      }
    });

    root.addEventListener("change", (e) => {
      const sel = e.target.closest("[data-action]");
      if (!sel) return;

      const action = sel.getAttribute("data-action");
      const obsId = Number(sel.getAttribute("data-obs"));
      const recId = Number(sel.getAttribute("data-rec"));
      const audId = Number(sel.getAttribute("data-aud"));

      const obs = engagement.reportingList.find(o => Number(o.id) === obsId);
      if (!obs) return;
      const rec = (obs.recommendations || []).find(r => Number(r.id) === recId);
      if (!rec) return;
      const aud = (rec.auditees || []).find(a => Number(a.id) === audId);

      if (action === "auditee-user" && aud) {
        aud.userId = Number(sel.value);
        saveAndReload(state);
      }
      if (action === "auditee-type" && aud) {
        aud.type = sel.value;
        saveAndReload(state);
      }
    });

    root.addEventListener("input", (e) => {
      const area = e.target.closest("[data-action]");
      if (!area) return;
      const action = area.getAttribute("data-action");
      const obsId = Number(area.getAttribute("data-obs"));
      const recId = Number(area.getAttribute("data-rec"));

      const obs = engagement.reportingList.find(o => Number(o.id) === obsId);
      if (!obs) return;
      const rec = (obs.recommendations || []).find(r => Number(r.id) === recId);
      if (!rec) return;

      if (action === "rec-mgmt") {
        rec.mgmtComment = area.textContent || "";
        saveState(state);
      }
    });

    root.addEventListener("input", (e) => {
      const ta = e.target.closest("textarea[data-action='rec-text']");
      if (!ta) return;
      const obsId = Number(ta.getAttribute("data-obs"));
      const recId = Number(ta.getAttribute("data-rec"));

      const obs = engagement.reportingList.find(o => Number(o.id) === obsId);
      if (!obs) return;
      const rec = (obs.recommendations || []).find(r => Number(r.id) === recId);
      if (!rec) return;

      rec.text = ta.value;
      saveState(state);
    });

    function saveAndReload(state) {
      saveState(state);
      location.reload();
    }
  }

  function mountFollowUpParticulars(state) {
    const el = document.getElementById("page-root");
    if (!el) return;

    const { id } = qs();
    const engagement = state.engagements.find(e => String(e.id) === String(id)) || state.engagements[0];
    const { roleKey, user } = getCurrentUser(state);

    const obsList = (engagement.reportingList || []).filter(o => Number(o.stepNo) >= 5);

    const obsHtml = obsList.map((obs) => {
      const step = Number(obs.stepNo);
      const showCheck = step >= 7;

      const recBlocks = (obs.recommendations || [])
        .filter(r => roleKey !== "MGMT" ? true : recommendationVisibilityForMgmt(r, user.id))
        .map((r, rIdx) => renderFollowUpRecommendation({ state, engagement, obs, rec: r, recIndex: rIdx }))
        .join("");

      return `
        <div class="accordion-item">
          <h2 class="accordion-header" id="hf-${obs.id}">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
              data-bs-target="#cf-${obs.id}" aria-expanded="false" aria-controls="cf-${obs.id}">
              <div class="d-flex w-100 me-3 align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                  ${showCheck ? `<i class="fa fa-check-circle fs-4 text-success"></i>` : `<i class="fa fa-circle-o text-muted"></i>`}
                  <span>${escapeHtml(obs.observationTitle)} ----- ${escapeHtml(stepLabelFollowUp(step))}</span>
                </div>
                <span class="badge badge-step">Step ${step}</span>
              </div>
            </button>
          </h2>
          <div id="cf-${obs.id}" class="accordion-collapse collapse" data-bs-parent="#accordionFlushExample">
            <div class="accordion-body">

              <div class="d-flex items-center mb-4 justify-content-between">
                <div class="flex-1" style="width:70%;">
                  <label>Observation Title:</label>
                  <input class="form-control w-100" type="text" value="${escapeHtml(obs.observationTitle)}" disabled />
                </div>
                <div class="flex-1 d-flex justify-content-end" style="width:30%;">
                  <span class="chip"><i class="fa fa-map-marker me-1"></i>${escapeHtml(getSubLocationLabel(state, obs.subLocation))}</span>
                </div>
              </div>

              ${engagement.riskApproach === "Checklist" ? `
              <div class="d-flex items-center mb-4">
                <div class="flex-1 w-100">
                  <label>Area:</label>
                  <input class="form-control w-100" type="text" value="${escapeHtml(obs.area)}" disabled />
                </div>
              </div>` : ""}

              <div class="mb-4">${renderRichMock("Observation", obs.observationName, false, "")}</div>

              <div class="mb-4">
                <label>Management Comments:</label>
                ${renderRichMock(" ", obs.managementComments, false, "")}
              </div>

              <hr class="my-4"/>

              <div class="sub-heading fw-bold mb-2">Follow-up (per Recommendation)</div>
              <div class="help-note mb-3">Auditee updates implementation status per recommendation. Approvers can approve at Step 6. (Static model)</div>

              <div class="d-grid gap-3">
                ${recBlocks || `<div class="help-note">No recommendations available.</div>`}
              </div>

            </div>
          </div>
        </div>
      `;
    }).join("");

    el.innerHTML = `
      <header class="section-header my-3 align-items-center text-start d-flex">
        <a class="text-primary" href="followup-list.html"><i class="fa fa-arrow-left text-primary fs-5 pe-3"></i></a>
        <div class="mb-0 heading">Follow-Up</div>
      </header>

      <div class="card-like p-3">
        <div class="sub-heading fw-bold mb-2">${escapeHtml(engagement.title)}</div>
        <div class="accordion" id="accordionFlushExample">${obsHtml}</div>
      </div>
    `;

    wireFollowUpActions(state, engagement);
  }

  function renderFollowUpRecommendation({ state, engagement, obs, rec, recIndex }) {
    const { roleKey, user } = getCurrentUser(state);
    const auditeeId = obs.auditeeId;
    const isAuditee = roleKey === "MGMT" && Number(user.id) === Number(auditeeId);

    const allowEditLastSection = Number(obs.stepNo) === 5 && isAuditee;

    const approverAllowed = isApproverForStep6(state, engagement, user.id);

    const implemented = (rec.followup?.recommendationsImplemented ?? "").toString();
    const showTestNextYear = Number(obs.stepNo) >= 6 && implemented === "true";

    const approveButtons = (() => {
      if (Number(obs.stepNo) !== 6 || !approverAllowed) return "";
      const goTo = implemented === "true" ? "step7" : "step5";
      return `
        <div class="rec-actions d-flex gap-2 justify-content-end">
          <button class="btn btn-primary btn-sm" data-action="fu-approve" data-obs="${obs.id}" data-rec="${rec.id}" data-to="${goTo}">
            <i class="fa fa-check me-1"></i> Approve
          </button>
          <button class="btn btn-primary btn-sm" data-action="fu-feedback" data-obs="${obs.id}" data-rec="${rec.id}">
            FeedBack
          </button>
        </div>
      `;
    })();

    const saveSubmitButtons = (() => {
      if (Number(obs.stepNo) !== 5 || !isAuditee) return "";
      return `
        <div class="rec-actions d-flex gap-2 justify-content-end">
          <button class="btn btn-primary btn-sm" data-action="fu-save" data-obs="${obs.id}" data-rec="${rec.id}">
            Save
          </button>
          <button class="btn btn-primary btn-sm" data-action="fu-submit" data-obs="${obs.id}" data-rec="${rec.id}">
            Submit
          </button>
        </div>
      `;
    })();

    const viewThirdFeedback = obs.thirdFeedback?.description
      ? `<button class="btn btn-outline-primary btn-sm" data-action="fu-view-feedback" data-obs="${obs.id}">View FeedBack</button>`
      : "";

    return `
      <div class="rec-card">
        <div class="rec-header">
          <div class="kv">
            <div class="rec-title">Recommendation #${recIndex + 1}</div>
            <span class="badge bg-light text-dark border">${escapeHtml(rec.status || "—")}</span>
          </div>
          <div class="d-flex gap-2">
            ${viewThirdFeedback}
          </div>
        </div>

        <div class="mt-2">
          <label>Recommendation</label>
          <textarea class="form-control form-control-sm" disabled>${escapeHtml(rec.text || "")}</textarea>
        </div>

        <div class="mt-3">
          <label class="py-1">Implementation Date:</label>
          <input type="date" class="form-control form-control-sm" value="${escapeHtml(formatDate(obs.implementationDate))}" disabled />
        </div>

        <div class="mt-3">
          <label class="pe-4">Recommendations Implemented:</label>
          <select class="form-select form-select-sm" name="recommendationsImplemented"
            data-action="fu-implemented" data-obs="${obs.id}" data-rec="${rec.id}" ${allowEditLastSection ? "" : "disabled"}>
            <option value="">Select One</option>
            <option value="true" ${implemented === "true" ? "selected" : ""}>Yes</option>
            <option value="false" ${implemented === "false" ? "selected" : ""}>No</option>
          </select>
        </div>

        <div class="mt-3">
          ${renderRichMock(implemented === "false" ? "Comments:" : "Final Comments:", rec.followup?.finalComments || "", allowEditLastSection,
      `data-action="fu-final" data-obs="${obs.id}" data-rec="${rec.id}"`)}
        </div>

        ${(implemented === "false" || rec.followup?.nextImplementationDate) ? `
          <div class="mt-3">
            <label class="py-1">Next Implementation Date:</label>
            <input type="date" class="form-control form-control-sm"
              value="${escapeHtml(formatDate(rec.followup?.nextImplementationDate || ""))}"
              name="nextImplementationDate"
              data-action="fu-nextdate" data-obs="${obs.id}" data-rec="${rec.id}"
              ${allowEditLastSection && implemented !== "true" ? "" : "disabled"} />
          </div>
        ` : ""}

        ${showTestNextYear ? `
          <div class="mt-3">
            <label class="pe-4">Test In Next Year:</label>
            <select class="form-select form-select-sm" name="testInNextYear"
              data-action="fu-test" data-obs="${obs.id}" data-rec="${rec.id}"
              ${Number(obs.stepNo) === 6 && approverAllowed ? "" : "disabled"}>
              <option value="">Select One</option>
              <option value="true" ${(rec.followup?.testInNextYear || "").toString() === "true" ? "selected" : ""}>Yes</option>
              <option value="false" ${(rec.followup?.testInNextYear || "").toString() === "false" ? "selected" : ""}>No</option>
            </select>
          </div>
        ` : ""}

        <div class="mt-3">
          ${saveSubmitButtons}
          ${approveButtons}
        </div>
      </div>
    `;
  }

  function wireFollowUpActions(state, engagement) {
    const root = document.getElementById("page-root");
    if (!root) return;

    function findObsRec(obsId, recId) {
      const obs = engagement.reportingList.find(o => Number(o.id) === Number(obsId));
      if (!obs) return {};
      const rec = (obs.recommendations || []).find(r => Number(r.id) === Number(recId));
      return { obs, rec };
    }

    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const obsId = Number(btn.getAttribute("data-obs"));
      const recId = Number(btn.getAttribute("data-rec"));

      const { obs, rec } = findObsRec(obsId, recId);

      if (action === "fu-save") {
        saveState(state);
        alert("Saved (static model).");
      }

      if (action === "fu-submit") {
        if (obs) obs.stepNo = 6;
        saveState(state);
        location.reload();
      }

      if (action === "fu-approve") {
        const to = btn.getAttribute("data-to");
        if (obs) {
          if (to === "step7") obs.stepNo = 7;
          if (to === "step5") obs.stepNo = 5;
        }
        saveState(state);
        location.reload();
      }

      if (action === "fu-view-feedback") {
        if (obs?.thirdFeedback?.description) alert("Third Feedback:\n\n" + obs.thirdFeedback.description);
      }

      if (action === "fu-feedback") {
        alert("Feedback dialog (static model placeholder).");
      }
    });

    root.addEventListener("change", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const action = el.getAttribute("data-action");
      const obsId = Number(el.getAttribute("data-obs"));
      const recId = Number(el.getAttribute("data-rec"));
      const { rec } = findObsRec(obsId, recId);
      if (!rec) return;

      if (action === "fu-implemented") {
        rec.followup.recommendationsImplemented = el.value;
        if (el.value === "true") rec.followup.nextImplementationDate = "";
        saveState(state);
        location.reload();
      }

      if (action === "fu-nextdate") {
        rec.followup.nextImplementationDate = el.value;
        saveState(state);
      }

      if (action === "fu-test") {
        rec.followup.testInNextYear = el.value;
        saveState(state);
      }
    });

    root.addEventListener("input", (e) => {
      const area = e.target.closest("[data-action]");
      if (!area) return;
      const action = area.getAttribute("data-action");
      const obsId = Number(area.getAttribute("data-obs"));
      const recId = Number(area.getAttribute("data-rec"));
      const { rec } = findObsRec(obsId, recId);
      if (!rec) return;

      if (action === "fu-final") {
        rec.followup.finalComments = area.textContent || "";
        saveState(state);
      }
    });
  }

  function init() {
    const state = loadState();
    mountHeader(state);

    const page = document.body.getAttribute("data-page");
    if (page === "reporting-list") {
      mountSidebar("reporting-list");
      mountReportingList(state);
    } else if (page === "followup-list") {
      mountSidebar("followup-list");
      mountFollowUpList(state);
    } else if (page === "reporting-particulars") {
      mountSidebar("reporting-list");
      mountReportingParticulars(state);
    } else if (page === "followup-particulars") {
      mountSidebar("followup-list");
      mountFollowUpParticulars(state);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();