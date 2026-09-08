(function () {
  "use strict";

  const app = document.getElementById("app");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebarNav = document.getElementById("sidebarNav");
  const newChatBtn = document.getElementById("newChatBtn");
  const themeToggle = document.getElementById("themeToggle");
  const welcomeView = document.getElementById("welcomeView");
  const chatView = document.getElementById("chatView");
  const thread = document.getElementById("thread");
  const composerWelcome = document.getElementById("composerWelcome");
  const inputWelcome = document.getElementById("inputWelcome");
  const composerBottom = document.getElementById("composerBottom");
  const inputBottom = document.getElementById("inputBottom");
  const greetingWord = document.getElementById("greetingWord");
  const quickActions = document.getElementById("quickActions");

  let hasChatted = false;

  // Time-based greeting, using the participant's local browser time.
  function setGreeting() {
    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour >= 5 && hour < 12) greeting = "Good morning";
    else if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    greetingWord.textContent = greeting;
  }

  function nowLabel() {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
  }

  // Theme persistence.
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("cbc2-theme", theme);
    themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    themeToggle.title = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    themeToggle.textContent = theme === "dark" ? "☀" : "◐";
  }

  const savedTheme = localStorage.getItem("cbc2-theme");
  applyTheme(savedTheme === "dark" ? "dark" : "light");
  setGreeting();
  setInterval(setGreeting, 60_000);

  function openSidebar() {
    app.classList.add("sidebar-open");
    sidebarToggle.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    app.classList.remove("sidebar-open");
    sidebarToggle.setAttribute("aria-expanded", "false");
  }

  function showWelcomeView() {
    hasChatted = false;
    welcomeView.hidden = false;
    chatView.hidden = true;
    composerBottom.hidden = true;
    thread.innerHTML = "";
    inputWelcome.value = "";
    setGreeting();
    inputWelcome.focus();
    document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("is-active"));
    document.querySelector('.nav-item[data-action="home"]')?.classList.add("is-active");
  }

  function showChatView() {
    if (hasChatted) return;
    hasChatted = true;
    welcomeView.hidden = true;
    chatView.hidden = false;
    composerBottom.hidden = false;
    inputBottom.focus();
  }

  function scrollToEnd() {
    requestAnimationFrame(() => { chatView.scrollTop = chatView.scrollHeight; });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeUrl(rawUrl) {
    try {
      const url = new URL(rawUrl, window.location.origin);
      if (!["http:", "https:"].includes(url.protocol)) return null;
      return url.href;
    } catch {
      return null;
    }
  }

  function linkifyEscaped(line) {
    // Markdown links first.
    line = line.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
      const safe = safeUrl(url);
      return safe
        ? `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : `${label} (${escapeHtml(url)})`;
    });

    // Plain URLs / www links.
    line = line.replace(/(^|[\s(])((?:https?:\/\/|www\.)[^\s<)]+)/g, (match, prefix, raw) => {
      const cleaned = raw.replace(/[.,!?;:]+$/, "");
      const trailing = raw.slice(cleaned.length);
      const normalized = cleaned.startsWith("www.") ? `https://${cleaned}` : cleaned;
      const safe = safeUrl(normalized);
      return safe
        ? `${prefix}<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(cleaned)}</a>${escapeHtml(trailing)}`
        : match;
    });

    return line;
  }

  function formatLabels(line) {
    // Make common answer labels easier to scan without changing their wording.
    return line.replace(
      /\b(Student Status|Verification|Team Size|Leadership & Roster|Exclusivity|Identity Proof|Registration|Eligibility|Date|Venue|Location|Address|Contact|Phone|Email|Website|Official Website)\s*:/gi,
      (label) => `<strong>${escapeHtml(label.replace(/:$/, ""))}:</strong>`
    );
  }

  function renderRichText(text) {
    let source = String(text ?? "").replace(/\r\n?/g, "\n").trim();
    if (!source) return "<div class=\"answer-paragraph\">No answer available.</div>";

    // Many PDF-to-text responses flatten bullets and numbered sections into one line.
    // Restore visual structure without changing the actual content.
    source = source
      .replace(/\s*•\s*/g, "\n• ")
      .replace(/\s+(?=(\d+)\s+[A-Z][A-Za-z0-9&/()'’\- ]{2,70}\s+•)/g, "\n")
      .replace(/\s+(?=(#{1,3})\s+)/g, "\n");

    const lines = source.split("\n").map((line) => line.trim()).filter((line, i, arr) => line || (i > 0 && arr[i - 1]));
    let html = "";

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw) {
        html += '<div class="answer-spacer" aria-hidden="true"></div>';
        continue;
      }

      // Markdown headings from the knowledge base.
      const mdHeading = raw.match(/^#{1,3}\s+(.+)$/);
      if (mdHeading) {
        html += `<h3 class="answer-section-title">${linkifyEscaped(escapeHtml(mdHeading[1]))}</h3>`;
        continue;
      }

      // "1 Eligibility & Team Formation • Student Status: ..."
      const numberedSection = raw.match(/^(\d+)\s+(.+?)(?:\s+•\s*(.*))?$/);
      if (numberedSection && numberedSection[2].length <= 90 && /^[A-Z]/.test(numberedSection[2])) {
        html += `<section class="answer-section">`;
        html += `<h3 class="answer-section-title"><span class="answer-section-number">${escapeHtml(numberedSection[1])}</span>${linkifyEscaped(escapeHtml(numberedSection[2]))}</h3>`;
        if (numberedSection[3]) {
          const bulletText = numberedSection[3].trim();
          html += `<div class="answer-bullet">${formatLabels(linkifyEscaped(escapeHtml(bulletText)))}</div>`;
        }
        html += `</section>`;
        continue;
      }

      // Bullets (including the bullet character produced from flattened PDF text).
      const bullet = raw.match(/^[•●▪◦\-*]\s+(.+)$/);
      if (bullet) {
        html += `<div class="answer-bullet"><span class="answer-bullet-dot">•</span><span>${formatLabels(linkifyEscaped(escapeHtml(bullet[1])))}</span></div>`;
        continue;
      }

      // Regular numbered items.
      const numberedItem = raw.match(/^(\d+)[.)]\s+(.+)$/);
      if (numberedItem) {
        html += `<div class="answer-numbered"><span class="answer-number-badge">${escapeHtml(numberedItem[1])}</span><span>${formatLabels(linkifyEscaped(escapeHtml(numberedItem[2])))}</span></div>`;
        continue;
      }

      // Reference/meta line.
      if (/^(Ref|Reference)\s*:/i.test(raw)) {
        html += `<div class="answer-reference">${formatLabels(linkifyEscaped(escapeHtml(raw)))}</div>`;
        continue;
      }

      // Ordinary paragraph.
      html += `<p class="answer-paragraph">${formatLabels(linkifyEscaped(escapeHtml(raw)))}</p>`;
    }

    return `<div class="answer-content">${html}</div>`;
  }

  function extractLinks(text) {
    const links = [];
    const markdown = /\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/g;
    let match;
    while ((match = markdown.exec(text))) links.push(match[1]);
    const bare = /(https?:\/\/[^\s<>"')\]]+)/g;
    while ((match = bare.exec(text))) if (!links.includes(match[1])) links.push(match[1]);
    return links;
  }

  function mapsUrlFromAnswer(text) {
    const direct = extractLinks(text).find((url) => /(?:google\.[^/]+\/maps|maps\.app\.goo\.gl)/i.test(url));
    if (direct) return direct;

    const match = text.match(/(?:venue|location|address)\s*[:\-]\s*([^\n]+)/i);
    if (!match) return null;

    const location = match[1]
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/[|,;]+$/, "")
      .trim();

    if (location.length < 4) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  }

  function addActionButtons(container, text) {
    const links = extractLinks(text);
    const mapsUrl = mapsUrlFromAnswer(text);
    const unique = [];
    links.forEach((url) => { if (!unique.includes(url)) unique.push(url); });
    if (mapsUrl && !unique.includes(mapsUrl)) unique.push(mapsUrl);
    if (!unique.length) return;

    const actions = document.createElement("div");
    actions.className = "msg__actions";

    unique.slice(0, 4).forEach((url) => {
      const safe = safeUrl(url);
      if (!safe) return;
      const a = document.createElement("a");
      a.className = "link-button";
      a.href = safe;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const isMap = /(?:maps|google\.[^/]+\/maps)/i.test(url);
      a.textContent = isMap ? "⌖ Open in Maps" : "↗ Open website";
      actions.appendChild(a);
    });

    container.appendChild(actions);
  }

  function addMessage(text, who) {
    const msg = document.createElement("div");
    msg.className = `msg msg--${who}`;

    const meta = document.createElement("div");
    meta.className = "msg__meta";
    meta.textContent = who === "bot" ? `CBC 2.0 Assistant · ${nowLabel()}` : `You · ${nowLabel()}`;

    const bubble = document.createElement("div");
    bubble.className = "msg__bubble";
    bubble.innerHTML = renderRichText(text);

    msg.append(meta, bubble);
    if (who === "bot") addActionButtons(bubble, text);

    thread.appendChild(msg);
    scrollToEnd();
    return msg;
  }

  function addTypingIndicator() {
    const msg = document.createElement("div");
    msg.className = "msg msg--bot msg--typing";
    msg.innerHTML = `<div class="msg__meta">CBC 2.0 Assistant · thinking</div><div class="msg__bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
    thread.appendChild(msg);
    scrollToEnd();
    return msg;
  }

  function isAmbiguousHeadQuestion(text) {
    const q = String(text || "").toLowerCase().replace(/[?!.]+$/g, "").trim();

    // Ask for clarification instead of guessing a department/committee head.
    // Examples: "who is the head?", "who is head of this?", "who is the head of this event?"
    const asksWho = /\b(who|which)\b/.test(q);
    const asksHead = /\b(head|co[- ]?head)\b/.test(q);
    const hasSpecificRole = /\b(technical|stage|creative|social media|hospitality|registration|discipline|logistics|convener|co[- ]?convener|treasurer)\b/.test(q);

    return asksWho && asksHead && !hasSpecificRole;
  }

  const headRoles = [
    ["Technical Head", "Who is the Technical Head?"],
    ["Stage Head", "Who is the Stage Head?"],
    ["Creative Head", "Who is the Creative Head?"],
    ["Social Media Head", "Who is the Social Media Head?"],
    ["Hospitality Head", "Who is the Hospitality Head?"],
    ["Registration Head", "Who is the Registration Head?"],
    ["Discipline Head", "Who is the Discipline Head?"],
    ["Logistics Head", "Who is the Logistics Head?"]
  ];

  function addHeadClarification() {
    const msg = document.createElement("div");
    msg.className = "msg msg--bot";

    const meta = document.createElement("div");
    meta.className = "msg__meta";
    meta.textContent = `CBC 2.0 Assistant · ${nowLabel()}`;

    const bubble = document.createElement("div");
    bubble.className = "msg__bubble head-clarification";
    bubble.innerHTML = `
      <p class="answer-paragraph"><strong>Which head are you looking for?</strong></p>
      <p class="answer-paragraph">There are several committee heads in CBC 2.0. Please choose one:</p>
      <div class="head-options" aria-label="Committee head options"></div>`;

    const options = bubble.querySelector(".head-options");
    headRoles.forEach(([label, query]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "head-option";
      button.textContent = label;
      button.addEventListener("click", () => sendMessage(query));
      options.appendChild(button);
    });

    msg.append(meta, bubble);
    thread.appendChild(msg);
    scrollToEnd();
  }

  async function sendMessage(rawText) {
    const text = String(rawText || "").trim();
    if (!text) return;

    showChatView();
    addMessage(text, "user");

    if (isAmbiguousHeadQuestion(text)) {
      addHeadClarification();
      return;
    }

    const typing = addTypingIndicator();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      typing.remove();
      addMessage(data.answer || "Sorry, I could not find an answer for that.", "bot");
    } catch (error) {
      typing.remove();
      addMessage("I couldn't reach the assistant server right now. Please try again in a moment.", "bot");
      console.error(error);
    }
  }

  sidebarToggle?.addEventListener("click", () => {
    app.classList.contains("sidebar-open") ? closeSidebar() : openSidebar();
  });
  sidebarOverlay?.addEventListener("click", closeSidebar);

  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  newChatBtn.addEventListener("click", () => {
    showWelcomeView();
    closeSidebar();
  });

  composerWelcome.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = inputWelcome.value.trim();
    if (!text) return;
    inputWelcome.value = "";
    sendMessage(text);
  });

  composerBottom.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = inputBottom.value.trim();
    if (!text) return;
    inputBottom.value = "";
    sendMessage(text);
  });

  sidebarNav.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-item");
    if (!btn) return;
    document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("is-active"));
    btn.classList.add("is-active");
    if (btn.dataset.action === "home") showWelcomeView();
    else if (btn.dataset.query) sendMessage(btn.dataset.query);
    if (window.innerWidth <= 900) closeSidebar();
  });

  quickActions.addEventListener("click", (e) => {
    const btn = e.target.closest(".quick-chip");
    if (btn?.dataset.query) sendMessage(btn.dataset.query);
  });

  inputWelcome.focus();
})();
