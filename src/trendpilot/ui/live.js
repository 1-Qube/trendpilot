/* Live bridge. The visual shell stays; research calls the agent. */
(function () {
  const PRESETS = {
    saas: {
      name: "Karatau Materials",
      sector: "building materials yard",
      label: "Materials yard",
      city: "Taraz",
      offer: "cement, insulation, drywall, and delivery inside the city",
      customer: "small crews and households doing repairs",
      channel: "WhatsApp and a 2GIS card",
      constraint: "thin cash, one truck, cannot stock a new category on a guess",
      competitors: "other building-material yards in Taraz",
    },
    ecom: {
      name: "Satti Med",
      sector: "private outpatient clinic",
      label: "Clinic",
      city: "Taraz",
      offer: "paid checkups, pediatrics, and basic diagnostics",
      customer: "families who already use Instagram and 2GIS to pick a clinic",
      channel: "Instagram and a 2GIS card",
      constraint: "two doctors, weekday evenings only, no ad budget",
      competitors: "other private clinics listed on 2GIS in Taraz",
    },
    retail: {
      name: "Aksu Route Desk",
      sector: "small tour desk",
      label: "Tour desk",
      city: "Taraz",
      offer: "day trips toward Aksu-Zhabagly and the Karatau foothills",
      customer: "visitors and local families booking by phone",
      channel: "Instagram and phone",
      constraint: "two guides, weekends only, no marketplace fees",
      competitors: "other Taraz tour desks and regional park tours",
    },
  };

  const PROMPTS = {
    competitors: "Analyze my competitors from public sources only. Do not invent numbers.",
    opportunities: "Find one local market opportunity I can test without a new ad budget.",
    demand: "Check whether there is local demand for what I already sell.",
    pricing: "Suggest a pricing test I can run on the channel I already own. No ads.",
    risks: "What local risk should I watch, and what should I refuse to do?",
  };

  const STATUS = {
    act: "Test this",
    watch: "Watch",
    not_local: "Not local yet",
    unknown: "Unknown",
    do_nothing: "Do nothing",
  };

  let busy = false;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function state() {
    return window.TrendPilotState;
  }

  function toast(message) {
    const toastEl = document.getElementById("toastNotification");
    const text = document.getElementById("toastText");
    if (!toastEl || !text) return;
    text.textContent = message;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("flex");
    clearTimeout(window.__tpToast);
    window.__tpToast = setTimeout(() => {
      toastEl.classList.add("hidden");
      toastEl.classList.remove("flex");
    }, 2800);
  }

  function company() {
    const s = state();
    const langCode = (document.getElementById("currentLangCode") || {}).textContent || "EN";
    const language = langCode === "RU" ? "Russian" : langCode === "KK" ? "Kazakh" : "English";
    return {
      name: (s && s.bizName) || "Karatau Materials",
      industry: (s && s.sector) || "local business",
      size: "small",
      city: (s && s.city) || "Taraz",
      offer: (s && s.offer) || "",
      customer: (s && s.customer) || "",
      channel: (s && s.channel) || "",
      constraint: (s && s.constraint) || "",
      competitors: (s && s.competitors) || "",
      language,
    };
  }

  function applyCompany(profile) {
    const s = state();
    if (!s) return;
    Object.assign(s, profile);
    s.bizName = profile.name;
    s.sector = profile.sector;
    const name = document.getElementById("settingBizName");
    const sector = document.getElementById("settingSector");
    if (name) name.value = profile.name;
    if (sector) {
      let option = [...sector.options].find((item) => item.value === profile.sector);
      if (!option) {
        option = new Option(profile.sector, profile.sector, true, true);
        sector.add(option);
      }
      sector.value = profile.sector;
    }
    const context = document.getElementById("topContextName");
    if (context) context.textContent = profile.name;
    const label = document.getElementById("activePresetLabel");
    if (label) label.textContent = profile.label;
    const tag = document.getElementById("sidebarBizTag");
    if (tag) tag.textContent = profile.city + " · " + profile.sector;
    fillExtraFields();
    localStorage.setItem("trendpilot-company", JSON.stringify(company()));
  }

  function fillExtraFields() {
    const s = state();
    if (!s) return;
    for (const key of ["city", "offer", "customer", "channel", "constraint", "competitors"]) {
      const input = document.getElementById("setting" + key);
      if (input) input.value = s[key] || "";
    }
  }

  function readExtraFields() {
    const s = state();
    if (!s) return;
    for (const key of ["city", "offer", "customer", "channel", "constraint", "competitors"]) {
      const input = document.getElementById("setting" + key);
      if (input) s[key] = input.value.trim();
    }
  }

  function questionFor(key, custom) {
    if (custom) return custom;
    return PROMPTS[key] || "Find one local, evidenced bet. Search public sources, then file findings.";
  }

  function switchToChat() {
    if (window.TrendPilotSwitch) {
      window.TrendPilotSwitch("chat");
      return;
    }
    document.getElementById("viewHero")?.classList.add("hidden");
    document.getElementById("viewChat")?.classList.remove("hidden");
  }

  function star() {
    return `<svg class="w-5 h-5" viewBox="0 0 40 40" fill="none">
      <polygon points="20,2 25,15 20,20" fill="#18b4d8"/>
      <polygon points="20,2 15,15 20,20" fill="#0b7c97"/>
      <polygon points="38,20 25,25 20,20" fill="#0d8aa8"/>
      <polygon points="38,20 25,15 20,20" fill="#29c8ec"/>
      <polygon points="20,38 15,25 20,20" fill="#07596e"/>
      <polygon points="20,38 25,25 20,20" fill="#0b7c97"/>
      <polygon points="2,20 15,15 20,20" fill="#14a0c4"/>
      <polygon points="2,20 15,25 20,20" fill="#08667e"/>
    </svg>`;
  }

  function shell(userMessage) {
    const profile = company();
    return `
      <div class="flex flex-wrap items-center justify-between gap-2 bg-white/75 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-[#d6e4ee] text-xs text-[#4b6378]">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-[#dff1f6] text-[#0b7c97] font-semibold">Live research</span>
          <span>Business: <strong class="text-[#0c2033]">${esc(profile.name)}</strong> · ${esc(profile.city)}</span>
        </div>
      </div>
      <div class="flex justify-end animate-fade-up">
        <div class="max-w-[80%] sm:max-w-[65%] rounded-2xl rounded-tr-sm bg-[#0b7c97] text-white px-5 py-3.5 shadow-md">
          <div class="text-[14.5px] leading-relaxed">${esc(userMessage)}</div>
        </div>
      </div>
      <div id="liveAnalystCard" class="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-[#d6e4ee] shadow-lg space-y-5 animate-fade-up">
        <div class="flex items-start gap-3.5">
          <div class="w-9 h-9 rounded-full bg-[#d8eef5] flex items-center justify-center shrink-0">${star()}</div>
          <div class="space-y-2 flex-1">
            <div class="text-xs font-bold uppercase tracking-wider text-[#0b7c97]">TrendPilot</div>
            <p id="liveStatus" class="text-[14.5px] text-[#1c3448] leading-relaxed">Searching public sources…</p>
            <div id="liveTrace" class="space-y-1 text-xs text-[#4c6275]"></div>
          </div>
        </div>
        <div id="liveBody"></div>
      </div>`;
  }

  function addTrace(event) {
    const trace = document.getElementById("liveTrace");
    const status = document.getElementById("liveStatus");
    if (status) status.textContent = event.title || "Working";
    if (!trace || event.kind === "status") return;
    const line = document.createElement("div");
    line.className = "truncate";
    line.textContent = (event.title || event.kind) + (event.detail ? " — " + event.detail.split("\n")[0] : "");
    trace.appendChild(line);
    document.getElementById("viewChat")?.scrollTo({ top: 99999, behavior: "smooth" });
  }

  function renderFindings(findings) {
    const body = document.getElementById("liveBody");
    const status = document.getElementById("liveStatus");
    if (!findings) {
      if (status) status.textContent = "The agent finished without a filed bet.";
      return;
    }
    if (status) status.textContent = findings.market_read || findings.headline || "Findings filed.";
    const bets = findings.bets || [];
    const cards = bets.slice(0, 3).map((bet) => `
      <div class="bg-[#f4f9fc] rounded-2xl p-4 border border-[#dfedf5]">
        <div class="text-xs font-medium text-[#5c748a]">${esc(STATUS[bet.status] || bet.status)}</div>
        <div class="text-base font-extrabold text-[#0c2033] mt-1">${esc(bet.title)}</div>
        <div class="text-xs font-semibold text-[#0b7c97] mt-1">${esc(bet.cost || "")}</div>
      </div>`).join("");
    const rows = bets.map((bet) => `
      <tr class="hover:bg-[#f6fafd]">
        <td class="py-3 px-4 font-bold text-[#0c2033]">${esc(bet.title)}</td>
        <td class="py-3 px-4 text-[#3c5368]">${esc(STATUS[bet.status] || bet.status)}</td>
        <td class="py-3 px-4 text-[#3c5368]">${esc(bet.claim)}</td>
        <td class="py-3 px-4 text-[#3c5368]">${esc(bet.test)}</td>
      </tr>`).join("");
    const evidence = bets.flatMap((bet) => bet.evidence || []).map((item) => `
      <a class="block text-xs text-[#0b7c97] hover:underline truncate" href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.what_it_shows || item.url)}</a>`).join("");
    const first = bets[0] || {};
    body.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">${cards}</div>
      <div class="overflow-x-auto rounded-2xl border border-[#dfedf5]">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-[#edf5fa] text-[#283f54] text-xs font-bold uppercase tracking-wider">
              <th class="py-3 px-4">Bet</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Claim</th>
              <th class="py-3 px-4">Test</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#edf4f9] text-xs sm:text-[13px] bg-white">${rows}</tbody>
        </table>
      </div>
      <div class="space-y-1">${evidence}</div>
      <div class="bg-gradient-to-r from-[#eaf5f9] via-[#f1f8fc] to-[#eaf5f9] rounded-2xl p-5 border border-[#c5e0ee] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <span class="px-2.5 py-0.5 rounded-full bg-[#0b7c97] text-white text-[10.5px] font-bold uppercase tracking-wider">${esc(STATUS[first.status] || "Bet")}</span>
          <h4 class="text-base font-bold text-[#0c2033] pt-1">${esc(first.title || findings.headline)}</h4>
          <p class="text-xs sm:text-[13px] text-[#3a5268] leading-relaxed">${esc(first.kill_line || "")}</p>
        </div>
        <button id="bookmarkInsightBtn" class="shrink-0 px-4 py-2.5 rounded-xl bg-white hover:bg-[#0b7c97] text-[#0b7c97] hover:text-white border border-[#0b7c97]/30 font-semibold text-xs shadow-sm">Save insight</button>
      </div>`;
    document.getElementById("bookmarkInsightBtn")?.addEventListener("click", () => saveInsight(findings, first));
  }

  function saveInsight(findings, bet) {
    const s = state();
    if (!s) return;
    s.savedInsights.unshift({
      id: "ins-" + Date.now(),
      category: "Opportunities",
      title: bet.title || findings.headline,
      metric: STATUS[bet.status] || "Bet",
      body: bet.kill_line || bet.claim || findings.market_read,
      date: "Saved just now",
    });
    const badge = document.getElementById("savedCountBadge");
    if (badge) badge.textContent = String(s.savedInsights.length);
    toast("Saved to your Insights Board");
  }

  function remember(question, findings) {
    const s = state();
    if (!s) return;
    s.historySessions.unshift({
      id: "hist-" + Date.now(),
      title: (findings && findings.headline) || question,
      promptKey: "opportunities",
      category: "Live research",
      date: "Just now",
      summary: (findings && findings.market_read) || question,
      question,
    });
    const badge = document.getElementById("historyCountBadge");
    if (badge) badge.textContent = String(s.historySessions.length);
    const recent = document.getElementById("sidebarRecentList");
    if (recent) {
      const button = document.createElement("button");
      button.className = "recent-session-btn w-full text-left px-2.5 py-1.5 rounded-lg text-[12.5px] text-[#496176] hover:bg-[#e4eff6] hover:text-[#0c2033] truncate";
      button.textContent = s.historySessions[0].title;
      button.addEventListener("click", () => window.TrendPilotLive.launch("opportunities", question));
      recent.prepend(button);
    }
  }

  async function launch(key, custom) {
    if (busy) {
      toast("A research run is already going");
      return;
    }
    readExtraFields();
    const question = questionFor(key, custom);
    const container = document.getElementById("chatThreadContainer");
    if (!container) return;
    busy = true;
    switchToChat();
    container.innerHTML = shell(question);
    let findings = null;
    try {
      const response = await fetch("/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company(), question }),
      });
      if (!response.ok || !response.body) throw new Error("Agent HTTP " + response.status);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.kind === "done") findings = (event.payload || {}).findings || null;
          else if (event.kind === "error") addTrace(event);
          else addTrace(event);
        }
      }
      renderFindings(findings);
      remember(question, findings);
    } catch (error) {
      const status = document.getElementById("liveStatus");
      if (status) status.textContent = error.message || "The agent could not finish.";
    } finally {
      busy = false;
    }
  }

  function injectSettings() {
    const modal = document.querySelector("#settingsModal .space-y-4");
    if (!modal || document.getElementById("settingcity")) return;
    const fields = [
      ["city", "City", "Taraz"],
      ["offer", "What they sell", ""],
      ["customer", "Who pays", ""],
      ["channel", "Channel they already own", ""],
      ["constraint", "Hard constraint", ""],
      ["competitors", "Competitors or public URLs", ""],
    ];
    for (const [key, label, placeholder] of fields) {
      const wrap = document.createElement("div");
      wrap.innerHTML = `<label class="block text-xs font-semibold text-[#2c4459] mb-1">${label}</label>
        <input id="setting${key}" type="text" placeholder="${esc(placeholder)}" class="w-full px-3.5 py-2 rounded-xl border border-[#cde0ec] text-sm text-[#0c2033] focus:outline-none focus:border-[#0b7c97]" />`;
      modal.appendChild(wrap);
    }
  }

  function clearDemoMemory() {
    const s = state();
    if (!s) return;
    s.historySessions = [];
    s.savedInsights = [];
    const recent = document.getElementById("sidebarRecentList");
    if (recent) recent.innerHTML = "";
    const history = document.getElementById("historyCountBadge");
    const saved = document.getElementById("savedCountBadge");
    if (history) history.textContent = "0";
    if (saved) saved.textContent = "0";
  }

  function retitlePresets() {
    const labels = {
      saas: "Materials yard · Taraz",
      ecom: "Clinic · Taraz",
      retail: "Tour desk · Taraz",
    };
    document.querySelectorAll(".preset-switch-btn").forEach((button) => {
      const span = button.querySelector("span");
      if (span && labels[button.dataset.preset]) span.textContent = labels[button.dataset.preset];
      button.addEventListener("click", (event) => {
        event.stopImmediatePropagation();
        applyCompany(PRESETS[button.dataset.preset] || PRESETS.saas);
        document.getElementById("profileMenuPopover")?.classList.add("hidden");
        toast("Switched to " + (PRESETS[button.dataset.preset] || PRESETS.saas).name);
      }, true);
    });
  }

  function replaceMic() {
    const mic = document.getElementById("micBtn");
    if (!mic) return;
    const fresh = mic.cloneNode(true);
    mic.replaceWith(fresh);
    let timer = 0;
    fresh.addEventListener("click", () => {
      const wave = document.getElementById("voiceWaveform");
      const active = wave && !wave.classList.contains("hidden");
      if (!active) {
        wave?.classList.remove("hidden");
        wave?.classList.add("flex");
        timer = setTimeout(() => {
          wave?.classList.add("hidden");
          wave?.classList.remove("flex");
          const input = document.getElementById("promptInput");
          if (input) input.value = "What local change in Taraz should this business test this week, and what should it ignore?";
          toast("Voice note transcribed. Press send to research.");
        }, 1600);
      } else {
        clearTimeout(timer);
        wave.classList.add("hidden");
        wave.classList.remove("flex");
      }
    });
  }

  window.TrendPilotLive = { launch };

  window.addEventListener("DOMContentLoaded", () => {
    injectSettings();
    clearDemoMemory();
    retitlePresets();
    replaceMic();
    const saved = localStorage.getItem("trendpilot-company");
    if (saved) {
      try { applyCompany(JSON.parse(saved)); } catch (error) { applyCompany(PRESETS.saas); }
    } else {
      applyCompany(PRESETS.saas);
    }
    const save = document.getElementById("saveSettingsBtn");
    save?.addEventListener("click", () => {
      readExtraFields();
      const s = state();
      if (s) {
        s.bizName = document.getElementById("settingBizName")?.value.trim() || s.bizName;
        s.sector = document.getElementById("settingSector")?.value || s.sector;
      }
      localStorage.setItem("trendpilot-company", JSON.stringify(company()));
    });
  });
})();
