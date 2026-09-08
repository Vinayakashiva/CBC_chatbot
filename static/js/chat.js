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

  // ============================================================
  // GREETING
  // ============================================================

  function setGreeting() {
    const hour = new Date().getHours();

    let greeting = "Good evening";

    if (hour >= 5 && hour < 12) {
      greeting = "Good morning";
    } else if (hour >= 12 && hour < 17) {
      greeting = "Good afternoon";
    } else {
      greeting = "Good evening";
    }

    if (greetingWord) {
      greetingWord.textContent = greeting;
    }
  }

  function nowLabel() {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date());
  }

  setGreeting();

  // Update greeting automatically every minute
  setInterval(setGreeting, 60 * 1000);

  // ============================================================
  // THEME
  // ============================================================

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    localStorage.setItem("cbc2-theme", theme);

    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        theme === "dark"
          ? "Switch to light theme"
          : "Switch to dark theme"
      );

      themeToggle.title =
        theme === "dark"
          ? "Switch to light theme"
          : "Switch to dark theme";

      themeToggle.textContent = theme === "dark" ? "☀" : "◐";
    }
  }

  const savedTheme = localStorage.getItem("cbc2-theme");

  applyTheme(savedTheme === "dark" ? "dark" : "light");

  // ============================================================
  // SIDEBAR
  // ============================================================

  function openSidebar() {
    if (!app) return;

    app.classList.add("sidebar-open");

    if (sidebarToggle) {
      sidebarToggle.setAttribute("aria-expanded", "true");
    }
  }

  function closeSidebar() {
    if (!app) return;

    app.classList.remove("sidebar-open");

    if (sidebarToggle) {
      sidebarToggle.setAttribute("aria-expanded", "false");
    }
  }

  // ============================================================
  // VIEW MANAGEMENT
  // ============================================================

  function showWelcomeView() {
    hasChatted = false;

    if (welcomeView) welcomeView.hidden = false;
    if (chatView) chatView.hidden = true;
    if (composerBottom) composerBottom.hidden = true;

    if (thread) {
      thread.innerHTML = "";
    }

    if (inputWelcome) {
      inputWelcome.value = "";
      setGreeting();

      setTimeout(() => {
        inputWelcome.focus();
      }, 50);
    }

    document
      .querySelectorAll(".nav-item")
      .forEach((el) => el.classList.remove("is-active"));

    const homeButton = document.querySelector(
      '.nav-item[data-action="home"]'
    );

    if (homeButton) {
      homeButton.classList.add("is-active");
    }
  }

  function showChatView() {
    if (hasChatted) return;

    hasChatted = true;

    if (welcomeView) welcomeView.hidden = true;
    if (chatView) chatView.hidden = false;
    if (composerBottom) composerBottom.hidden = false;

    setTimeout(() => {
      if (inputBottom) {
        inputBottom.focus();
      }
    }, 50);
  }

  function scrollToEnd() {
    requestAnimationFrame(() => {
      if (chatView) {
        chatView.scrollTop = chatView.scrollHeight;
      }
    });
  }

  // ============================================================
  // HTML SAFETY
  // ============================================================

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

      if (!["http:", "https:"].includes(url.protocol)) {
        return null;
      }

      return url.href;
    } catch {
      return null;
    }
  }

  // ============================================================
  // LINK HANDLING
  // ============================================================

  function linkifyEscaped(line) {
    // ----------------------------------------------------------
    // Markdown links
    // Example:
    // [Official Website](https://example.com)
    // ----------------------------------------------------------

    line = line.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, label, url) => {
        const safe = safeUrl(url);

        if (!safe) {
          return `${escapeHtml(label)} (${escapeHtml(url)})`;
        }

        return `
          <a
            href="${escapeHtml(safe)}"
            target="_blank"
            rel="noopener noreferrer"
            class="chat-link"
          >
            ${escapeHtml(label)}
          </a>
        `;
      }
    );

    // ----------------------------------------------------------
    // Plain URLs
    // ----------------------------------------------------------

    line = line.replace(
      /(^|[\s(])((?:https?:\/\/|www\.)[^\s<)]+)/g,
      (match, prefix, raw) => {
        const cleaned = raw.replace(/[.,!?;:]+$/, "");
        const trailing = raw.slice(cleaned.length);

        const normalized = cleaned.startsWith("www.")
          ? `https://${cleaned}`
          : cleaned;

        const safe = safeUrl(normalized);

        if (!safe) {
          return match;
        }

        return `
          ${prefix}
          <a
            href="${escapeHtml(safe)}"
            target="_blank"
            rel="noopener noreferrer"
            class="chat-link"
          >
            ${escapeHtml(cleaned)}
          </a>
          ${escapeHtml(trailing)}
        `;
      }
    );

    return line;
  }

  // ============================================================
  // COMMON LABEL FORMATTING
  // ============================================================

  function formatLabels(line) {
    return line.replace(
      /\b(
        Student Status|
        Verification|
        Team Size|
        Leadership & Roster|
        Exclusivity|
        Identity Proof|
        Registration|
        Eligibility|
        Date|
        Dates|
        Time|
        Venue|
        Location|
        Address|
        Contact|
        Phone|
        Email|
        Website|
        Official Website|
        Prize|
        Prizes|
        Fee|
        Fees|
        Deadline|
        Organizer|
        Head|
        Co-Head
      )\s*:/gi,
      (label) => {
        return `<strong>${escapeHtml(
          label.replace(/:$/, "")
        )}:</strong>`;
      }
    );
  }

  // ============================================================
  // RICH ANSWER RENDERER
  // ============================================================

  function renderRichText(text) {
    let source = String(text ?? "")
      .replace(/\r\n?/g, "\n")
      .trim();

    if (!source) {
      return `
        <div class="answer-content">
          <p class="answer-paragraph">
            No answer available.
          </p>
        </div>
      `;
    }

    // ----------------------------------------------------------
    // Restore structure when PDF / knowledge text is flattened
    // ----------------------------------------------------------

    source = source
      .replace(/\s*•\s*/g, "\n• ")
      .replace(
        /\s+(?=(\d+)\s+[A-Z][A-Za-z0-9&/()'’\- ]{2,90}\s+•)/g,
        "\n"
      )
      .replace(/\s+(?=(#{1,3})\s+)/g, "\n");

    const lines = source
      .split("\n")
      .map((line) => line.trim());

    let html = "";

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];

      if (!raw) {
        html += `
          <div
            class="answer-spacer"
            aria-hidden="true"
          ></div>
        `;
        continue;
      }

      // --------------------------------------------------------
      // Markdown headings
      // --------------------------------------------------------

      const mdHeading = raw.match(/^#{1,3}\s+(.+)$/);

      if (mdHeading) {
        html += `
          <h3 class="answer-section-title">
            ${linkifyEscaped(
              escapeHtml(mdHeading[1])
            )}
          </h3>
        `;

        continue;
      }

      // --------------------------------------------------------
      // Numbered section
      //
      // 1 Eligibility & Team Formation
      // --------------------------------------------------------

      const numberedSection = raw.match(
        /^(\d+)\s+(.+?)(?:\s+•\s*(.*))?$/
      );

      if (
        numberedSection &&
        numberedSection[2].length <= 100 &&
        /^[A-Z]/.test(numberedSection[2])
      ) {
        html += `<section class="answer-section">`;

        html += `
          <h3 class="answer-section-title">
            <span class="answer-section-number">
              ${escapeHtml(numberedSection[1])}
            </span>
            ${linkifyEscaped(
              escapeHtml(numberedSection[2])
            )}
          </h3>
        `;

        if (numberedSection[3]) {
          const bulletText = numberedSection[3].trim();

          html += `
            <div class="answer-bullet">
              ${formatLabels(
                linkifyEscaped(
                  escapeHtml(bulletText)
                )
              )}
            </div>
          `;
        }

        html += `</section>`;

        continue;
      }

      // --------------------------------------------------------
      // Bullet points
      // --------------------------------------------------------

      const bullet = raw.match(
        /^[•●▪◦\-*]\s+(.+)$/
      );

      if (bullet) {
        html += `
          <div class="answer-bullet">
            <span class="answer-bullet-dot">•</span>

            <span>
              ${formatLabels(
                linkifyEscaped(
                  escapeHtml(bullet[1])
                )
              )}
            </span>
          </div>
        `;

        continue;
      }

      // --------------------------------------------------------
      // Numbered items
      // --------------------------------------------------------

      const numberedItem = raw.match(
        /^(\d+)[.)]\s+(.+)$/
      );

      if (numberedItem) {
        html += `
          <div class="answer-numbered">

            <span class="answer-number-badge">
              ${escapeHtml(numberedItem[1])}
            </span>

            <span>
              ${formatLabels(
                linkifyEscaped(
                  escapeHtml(numberedItem[2])
                )
              )}
            </span>

          </div>
        `;

        continue;
      }

      // --------------------------------------------------------
      // Reference line
      // --------------------------------------------------------

      if (/^(Ref|Reference)\s*:/i.test(raw)) {
        html += `
          <div class="answer-reference">
            ${formatLabels(
              linkifyEscaped(
                escapeHtml(raw)
              )
            )}
          </div>
        `;

        continue;
      }

      // --------------------------------------------------------
      // Normal paragraph
      // --------------------------------------------------------

      html += `
        <p class="answer-paragraph">
          ${formatLabels(
            linkifyEscaped(
              escapeHtml(raw)
            )
          )}
        </p>
      `;
    }

    return `
      <div class="answer-content">
        ${html}
      </div>
    `;
  }

  // ============================================================
  // LINK EXTRACTION
  // ============================================================

  function extractLinks(text) {
    const links = [];

    // Markdown URLs
    const markdown =
      /\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/g;

    let match;

    while ((match = markdown.exec(text))) {
      if (!links.includes(match[1])) {
        links.push(match[1]);
      }
    }

    // Plain URLs
    const bare =
      /(https?:\/\/[^\s<>"')\]]+)/g;

    while ((match = bare.exec(text))) {
      if (!links.includes(match[1])) {
        links.push(match[1]);
      }
    }

    return links;
  }

  // ============================================================
  // GOOGLE MAPS
  // ============================================================

  function mapsUrlFromAnswer(text) {
    const direct = extractLinks(text).find((url) =>
      /(?:google\.[^/]+\/maps|maps\.app\.goo\.gl)/i.test(url)
    );

    if (direct) {
      return direct;
    }

    // Try to find:
    // Venue: Global Academy of Technology
    // Location: Bengaluru
    // Address: ...
    const match = text.match(
      /(?:venue|location|address)\s*[:\-]\s*([^\n]+)/i
    );

    if (!match) {
      return null;
    }

    const location = match[1]
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/[|,;]+$/, "")
      .trim();

    if (location.length < 4) {
      return null;
    }

    return (
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(location)
    );
  }

  // ============================================================
  // ACTION BUTTONS
  // ============================================================

  function addActionButtons(container, text) {
    const links = extractLinks(text);

    const mapsUrl = mapsUrlFromAnswer(text);

    const unique = [];

    links.forEach((url) => {
      if (!unique.includes(url)) {
        unique.push(url);
      }
    });

    if (mapsUrl && !unique.includes(mapsUrl)) {
      unique.push(mapsUrl);
    }

    if (!unique.length) {
      return;
    }

    const actions =
      document.createElement("div");

    actions.className = "msg__actions";

    unique.slice(0, 4).forEach((url) => {
      const safe = safeUrl(url);

      if (!safe) {
        return;
      }

      const link =
        document.createElement("a");

      link.className = "link-button";

      link.href = safe;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const isMap =
        /(?:maps|google\.[^/]+\/maps)/i.test(
          url
        );

      link.textContent = isMap
        ? "⌖ Open in Maps"
        : "↗ Open website";

      actions.appendChild(link);
    });

    container.appendChild(actions);
  }

  // ============================================================
  // ADD MESSAGE
  // ============================================================

  function addMessage(text, who) {
    const msg =
      document.createElement("div");

    msg.className = `msg msg--${who}`;

    const meta =
      document.createElement("div");

    meta.className = "msg__meta";

    meta.textContent =
      who === "bot"
        ? `CBC 2.0 Assistant · ${nowLabel()}`
        : `You · ${nowLabel()}`;

    const bubble =
      document.createElement("div");

    bubble.className = "msg__bubble";

    bubble.innerHTML =
      renderRichText(text);

    msg.appendChild(meta);
    msg.appendChild(bubble);

    if (who === "bot") {
      addActionButtons(bubble, text);
    }

    thread.appendChild(msg);

    scrollToEnd();

    return msg;
  }

  // ============================================================
  // TYPING INDICATOR
  // ============================================================

  function addTypingIndicator() {
    const msg =
      document.createElement("div");

    msg.className =
      "msg msg--bot msg--typing";

    msg.innerHTML = `
      <div class="msg__meta">
        CBC 2.0 Assistant · thinking
      </div>

      <div class="msg__bubble">

        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>

      </div>
    `;

    thread.appendChild(msg);

    scrollToEnd();

    return msg;
  }

  // ============================================================
  // HEAD CLARIFICATION
  // ============================================================
  //
  // IMPORTANT:
  //
  // "head"
  // "who is the head"
  // "who is head"
  // "head of this"
  // "who is the head of this"
  //
  // should NOT automatically become Technical Head.
  //
  // But:
  //
  // "who is the technical head"
  // "registration head"
  //
  // should go to the backend directly.
  //
  // ============================================================

  function isAmbiguousHeadQuestion(text) {
    const q = String(text || "")
      .toLowerCase()
      .replace(/[?!.]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!q) {
      return false;
    }

    // ----------------------------------------------------------
    // Specific committee roles
    // ----------------------------------------------------------

    const specificRole =
      /\b(
        technical\s+head|
        stage\s+head|
        creative\s+head|
        social\s+media\s+head|
        hospitality\s+head|
        registration\s+head|
        discipline\s+head|
        logistics\s+head|
        technical|
        stage|
        creative|
        social\s+media|
        hospitality|
        registration|
        discipline|
        logistics|
        convener|
        co[- ]?convener|
        treasurer
      )\b/ix.test(q);

    // If a specific role exists,
    // do not ask for clarification.
    if (specificRole) {
      return false;
    }

    // ----------------------------------------------------------
    // Generic head questions
    // ----------------------------------------------------------

    const genericHeadQuestion =
      q === "head" ||

      q === "the head" ||

      q === "co-head" ||

      q === "co head" ||

      q === "the co-head" ||

      q === "the co head" ||

      /\bwho\s+is\s+(the\s+)?head\b/.test(q) ||

      /\bwho\s+is\s+(the\s+)?co[- ]?head\b/.test(q) ||

      /\bwhich\s+head\b/.test(q) ||

      /\bhead\s+of\s+(this|this\s+event|the\s+event|cbc\s*2\.?0)\b/.test(q) ||

      /\bco[- ]?head\s+of\s+(this|this\s+event|the\s+event|cbc\s*2\.?0)\b/.test(q) ||

      /\bwho\s+is\s+the\s+head\s+of\s+this\b/.test(q) ||

      /\bwho\s+is\s+the\s+head\s+of\s+this\s+event\b/.test(q);

    return genericHeadQuestion;
  }

  // ============================================================
  // HEAD OPTIONS
  // ============================================================

  const headRoles = [
    [
      "Technical Head",
      "Who is the Technical Head?"
    ],
    [
      "Stage Head",
      "Who is the Stage Head?"
    ],
    [
      "Creative Head",
      "Who is the Creative Head?"
    ],
    [
      "Social Media Head",
      "Who is the Social Media Head?"
    ],
    [
      "Hospitality Head",
      "Who is the Hospitality Head?"
    ],
    [
      "Registration Head",
      "Who is the Registration Head?"
    ],
    [
      "Discipline Head",
      "Who is the Discipline Head?"
    ],
    [
      "Logistics Head",
      "Who is the Logistics Head?"
    ]
  ];

  function addHeadClarification() {
    const msg =
      document.createElement("div");

    msg.className = "msg msg--bot";

    const meta =
      document.createElement("div");

    meta.className = "msg__meta";

    meta.textContent =
      `CBC 2.0 Assistant · ${nowLabel()}`;

    const bubble =
      document.createElement("div");

    bubble.className =
      "msg__bubble head-clarification";

    bubble.innerHTML = `
      <p class="answer-paragraph">

        <strong>
          Which head are you looking for?
        </strong>

      </p>

      <p class="answer-paragraph">

        There are several committee heads in CBC 2.0.
        Please select the one you want to know about.

      </p>

      <div
        class="head-options"
        aria-label="Committee head options"
      ></div>
    `;

    const options =
      bubble.querySelector(".head-options");

    headRoles.forEach(([label, query]) => {
      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        "head-option";

      button.textContent = label;

      button.addEventListener(
        "click",
        () => {
          sendMessage(query);
        }
      );

      options.appendChild(button);
    });

    msg.appendChild(meta);
    msg.appendChild(bubble);

    thread.appendChild(msg);

    scrollToEnd();
  }

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  async function sendMessage(rawText) {
    const text =
      String(rawText || "").trim();

    if (!text) {
      return;
    }

    showChatView();

    addMessage(text, "user");

    // ----------------------------------------------------------
    // IMPORTANT:
    // Check ambiguous "head" questions BEFORE backend call.
    // ----------------------------------------------------------

    if (isAmbiguousHeadQuestion(text)) {
      addHeadClarification();
      return;
    }

    const typing =
      addTypingIndicator();

    try {
      const res =
        await fetch("/api/chat", {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            message: text
          })
        });

      if (!res.ok) {
        throw new Error(
          `HTTP ${res.status}`
        );
      }

      const data =
        await res.json();

      typing.remove();

      addMessage(
        data.answer ||
          "Sorry, I could not find an answer for that.",
        "bot"
      );

    } catch (error) {
      typing.remove();

      addMessage(
        "I couldn't reach the assistant server right now. Please try again in a moment.",
        "bot"
      );

      console.error(
        "CBC 2.0 chat error:",
        error
      );
    }
  }

  // ============================================================
  // SIDEBAR EVENTS
  // ============================================================

  if (sidebarToggle) {
    sidebarToggle.addEventListener(
      "click",
      () => {
        if (
          app.classList.contains(
            "sidebar-open"
          )
        ) {
          closeSidebar();
        } else {
          openSidebar();
        }
      }
    );
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener(
      "click",
      closeSidebar
    );
  }

  // ============================================================
  // THEME TOGGLE
  // ============================================================

  if (themeToggle) {
    themeToggle.addEventListener(
      "click",
      () => {
        const next =
          document.documentElement
            .dataset.theme === "dark"
            ? "light"
            : "dark";

        applyTheme(next);
      }
    );
  }

  // ============================================================
  // NEW CHAT
  // ============================================================

  if (newChatBtn) {
    newChatBtn.addEventListener(
      "click",
      () => {
        showWelcomeView();
        closeSidebar();
      }
    );
  }

  // ============================================================
  // WELCOME COMPOSER
  // ============================================================

  if (composerWelcome) {
    composerWelcome.addEventListener(
      "submit",
      (e) => {
        e.preventDefault();

        const text =
          inputWelcome.value.trim();

        if (!text) {
          return;
        }

        inputWelcome.value = "";

        sendMessage(text);
      }
    );
  }

  // ============================================================
  // BOTTOM COMPOSER
  // ============================================================

  if (composerBottom) {
    composerBottom.addEventListener(
      "submit",
      (e) => {
        e.preventDefault();

        const text =
          inputBottom.value.trim();

        if (!text) {
          return;
        }

        inputBottom.value = "";

        sendMessage(text);
      }
    );
  }

  // ============================================================
  // SIDEBAR NAVIGATION
  // ============================================================

  if (sidebarNav) {
    sidebarNav.addEventListener(
      "click",
      (e) => {
        const btn =
          e.target.closest(
            ".nav-item"
          );

        if (!btn) {
          return;
        }

        document
          .querySelectorAll(".nav-item")
          .forEach((el) =>
            el.classList.remove(
              "is-active"
            )
          );

        btn.classList.add(
          "is-active"
        );

        if (
          btn.dataset.action ===
          "home"
        ) {
          showWelcomeView();
        } else if (
          btn.dataset.query
        ) {
          sendMessage(
            btn.dataset.query
          );
        }

        if (
          window.innerWidth <= 900
        ) {
          closeSidebar();
        }
      }
    );
  }

  // ============================================================
  // QUICK ACTIONS
  // ============================================================

  if (quickActions) {
    quickActions.addEventListener(
      "click",
      (e) => {
        const btn =
          e.target.closest(
            ".quick-chip"
          );

        if (
          btn &&
          btn.dataset.query
        ) {
          sendMessage(
            btn.dataset.query
          );
        }
      }
    );
  }

  // ============================================================
  // INITIAL FOCUS
  // ============================================================

  if (inputWelcome) {
    inputWelcome.focus();
  }

})();
