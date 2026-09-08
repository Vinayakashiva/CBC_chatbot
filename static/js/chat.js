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

  /* ============================================================
     GREETING
     ============================================================ */

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

  // Update the greeting every minute.
  setInterval(setGreeting, 60_000);


  /* ============================================================
     THEME
     ============================================================ */

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

      themeToggle.textContent =
        theme === "dark" ? "☀" : "◐";
    }
  }

  const savedTheme = localStorage.getItem("cbc2-theme");

  applyTheme(savedTheme === "dark" ? "dark" : "light");


  /* ============================================================
     SIDEBAR
     ============================================================ */

  function openSidebar() {
    if (!app) return;

    app.classList.add("sidebar-open");

    sidebarToggle?.setAttribute(
      "aria-expanded",
      "true"
    );
  }

  function closeSidebar() {
    if (!app) return;

    app.classList.remove("sidebar-open");

    sidebarToggle?.setAttribute(
      "aria-expanded",
      "false"
    );
  }


  /* ============================================================
     VIEW MANAGEMENT
     ============================================================ */

  function showWelcomeView() {
    hasChatted = false;

    if (welcomeView) {
      welcomeView.hidden = false;
    }

    if (chatView) {
      chatView.hidden = true;
    }

    if (composerBottom) {
      composerBottom.hidden = true;
    }

    if (thread) {
      thread.innerHTML = "";
    }

    if (inputWelcome) {
      inputWelcome.value = "";
    }

    if (inputBottom) {
      inputBottom.value = "";
    }

    setGreeting();

    document
      .querySelectorAll(".nav-item")
      .forEach((el) => el.classList.remove("is-active"));

    document
      .querySelector('.nav-item[data-action="home"]')
      ?.classList.add("is-active");

    setTimeout(() => {
      inputWelcome?.focus();
    }, 50);
  }

  function showChatView() {
    if (hasChatted) return;

    hasChatted = true;

    if (welcomeView) {
      welcomeView.hidden = true;
    }

    if (chatView) {
      chatView.hidden = false;
    }

    if (composerBottom) {
      composerBottom.hidden = false;
    }

    setTimeout(() => {
      inputBottom?.focus();
    }, 50);
  }


  /* ============================================================
     SCROLL
     ============================================================ */

  function scrollToEnd() {
    requestAnimationFrame(() => {
      if (!chatView) return;

      chatView.scrollTop = chatView.scrollHeight;
    });
  }


  /* ============================================================
     HTML SAFETY
     ============================================================ */

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
      const url = new URL(
        rawUrl,
        window.location.origin
      );

      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        return null;
      }

      return url.href;

    } catch {
      return null;
    }
  }


  /* ============================================================
     LINKS
     ============================================================ */

  function linkifyEscaped(line) {

    /*
     * Markdown links
     * Example:
     * [Official Website](https://example.com)
     */

    line = line.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      function (_, label, url) {

        const safe = safeUrl(url);

        if (!safe) {
          return `${label} (${escapeHtml(url)})`;
        }

        return `
          <a
            href="${escapeHtml(safe)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ${escapeHtml(label)}
          </a>
        `;
      }
    );


    /*
     * Normal URLs
     */

    line = line.replace(
      /(^|[\s(])((?:https?:\/\/|www\.)[^\s<)]+)/g,
      function (match, prefix, raw) {

        const cleaned = raw.replace(
          /[.,!?;:]+$/,
          ""
        );

        const trailing = raw.slice(
          cleaned.length
        );

        const normalized =
          cleaned.startsWith("www.")
            ? `https://${cleaned}`
            : cleaned;

        const safe = safeUrl(normalized);

        if (!safe) {
          return match;
        }

        return (
          `${prefix}` +
          `<a href="${escapeHtml(safe)}" ` +
          `target="_blank" ` +
          `rel="noopener noreferrer">` +
          `${escapeHtml(cleaned)}` +
          `</a>` +
          `${escapeHtml(trailing)}`
        );
      }
    );

    return line;
  }


  /* ============================================================
     LABEL FORMATTING
     ============================================================ */

  function formatLabels(line) {

    const labels = [
      "Student Status",
      "Verification",
      "Team Size",
      "Leadership & Roster",
      "Exclusivity",
      "Identity Proof",
      "Registration",
      "Eligibility",
      "Date",
      "Venue",
      "Location",
      "Address",
      "Contact",
      "Phone",
      "Email",
      "Website",
      "Official Website",
      "Rules",
      "Guidelines",
      "Prize",
      "Prizes",
      "Submission",
      "Judging",
      "Timing",
      "Schedule"
    ];

    const escapedLabels = labels
      .map((label) =>
        label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      )
      .join("|");

    const regex = new RegExp(
      `\\b(${escapedLabels})\\s*:`,
      "gi"
    );

    return line.replace(
      regex,
      (label) =>
        `<strong>${escapeHtml(label)}</strong>`
    );
  }


  /* ============================================================
     LONG ANSWER STRUCTURING
     ============================================================ */

  function renderRichText(text) {

    let source = String(text ?? "")
      .replace(/\r\n?/g, "\n")
      .trim();

    if (!source) {
      return `
        <div class="answer-paragraph">
          No answer available.
        </div>
      `;
    }


    /*
     * Restore bullets from flattened PDF text.
     */

    source = source.replace(
      /\s*•\s*/g,
      "\n• "
    );


    /*
     * Restore numbered sections.
     *
     * Example:
     *
     * 1 Eligibility & Team Formation • Student Status
     * 2 Registration & Identification • Identity Proof
     */

    source = source.replace(
      /\s+(?=(\d+)\s+[A-Z][A-Za-z0-9&/()'’\- ]{2,90}\s+•)/g,
      "\n"
    );


    /*
     * Restore markdown-style headings.
     */

    source = source.replace(
      /\s+(?=#{1,3}\s+)/g,
      "\n"
    );


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


      /*
       * Markdown headings
       *
       * # Title
       * ## Title
       * ### Title
       */

      const mdHeading = raw.match(
        /^#{1,3}\s+(.+)$/
      );

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


      /*
       * Numbered section
       *
       * 1 Eligibility & Team Formation
       * 2 Registration & Identification
       */

      const numberedSection = raw.match(
        /^(\d+)\s+(.+?)(?:\s+•\s*(.*))?$/
      );

      if (
        numberedSection &&
        numberedSection[2].length <= 100 &&
        /^[A-Z]/.test(numberedSection[2])
      ) {

        html += `
          <section class="answer-section">

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

          const bulletText =
            numberedSection[3].trim();

          html += `
            <div class="answer-bullet">

              <span class="answer-bullet-dot">
                •
              </span>

              <span>
                ${formatLabels(
                  linkifyEscaped(
                    escapeHtml(bulletText)
                  )
                )}
              </span>

            </div>
          `;
        }


        html += `
          </section>
        `;

        continue;
      }


      /*
       * Bullet item
       */

      const bullet = raw.match(
        /^[•●▪◦\-*]\s+(.+)$/
      );

      if (bullet) {

        html += `
          <div class="answer-bullet">

            <span class="answer-bullet-dot">
              •
            </span>

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


      /*
       * Normal numbered item
       */

      const numberedItem = raw.match(
        /^(\d+)[.)]\s+(.+)$/
      );

      if (numberedItem) {

        html += `
          <div class="answer-numbered">

            <span class="answer-number-badge">
              ${escapeHtml(
                numberedItem[1]
              )}
            </span>

            <span>
              ${formatLabels(
                linkifyEscaped(
                  escapeHtml(
                    numberedItem[2]
                  )
                )
              )}
            </span>

          </div>
        `;

        continue;
      }


      /*
       * Reference
       */

      if (
        /^(Ref|Reference)\s*:/i.test(raw)
      ) {

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


      /*
       * Normal paragraph
       */

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


  /* ============================================================
     LINK EXTRACTION
     ============================================================ */

  function extractLinks(text) {

    const links = [];

    let match;


    /*
     * Markdown links
     */

    const markdown =
      /\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/g;

    while ((match = markdown.exec(text))) {

      if (!links.includes(match[1])) {
        links.push(match[1]);
      }
    }


    /*
     * Normal URLs
     */

    const bare =
      /(https?:\/\/[^\s<>"')\]]+)/g;

    while ((match = bare.exec(text))) {

      if (!links.includes(match[1])) {
        links.push(match[1]);
      }
    }


    return links;
  }


  /* ============================================================
     MAPS URL
     ============================================================ */

  function mapsUrlFromAnswer(text) {

    const direct =
      extractLinks(text).find(
        (url) =>
          /(?:google\.[^/]+\/maps|maps\.app\.goo\.gl)/i.test(
            url
          )
      );

    if (direct) {
      return direct;
    }


    /*
     * Try to find:
     *
     * Venue: Global Academy of Technology
     * Location: Bengaluru
     * Address: ...
     */

    const match = text.match(
      /(?:venue|location|address)\s*[:\-]\s*([^\n]+)/i
    );

    if (!match) {
      return null;
    }


    const location = match[1]
      .replace(
        /https?:\/\/[^\s]+/g,
        ""
      )
      .replace(
        /[|,;]+$/,
        ""
      )
      .trim();


    if (location.length < 4) {
      return null;
    }


    return (
      "https://www.google.com/maps/search/" +
      "?api=1&query=" +
      encodeURIComponent(location)
    );
  }


  /* ============================================================
     LINK ACTION BUTTONS
     ============================================================ */

  function addActionButtons(container, text) {

    const links = extractLinks(text);

    const mapsUrl =
      mapsUrlFromAnswer(text);

    const unique = [];


    links.forEach((url) => {

      if (!unique.includes(url)) {
        unique.push(url);
      }

    });


    if (
      mapsUrl &&
      !unique.includes(mapsUrl)
    ) {
      unique.push(mapsUrl);
    }


    if (!unique.length) {
      return;
    }


    const actions =
      document.createElement("div");

    actions.className =
      "msg__actions";


    unique
      .slice(0, 4)
      .forEach((url) => {

        const safe = safeUrl(url);

        if (!safe) return;


        const a =
          document.createElement("a");

        a.className =
          "link-button";

        a.href = safe;

        a.target = "_blank";

        a.rel =
          "noopener noreferrer";


        const isMap =
          /(?:maps|google\.[^/]+\/maps)/i.test(
            url
          );


        a.textContent =
          isMap
            ? "⌖ Open in Maps"
            : "↗ Open website";


        actions.appendChild(a);

      });


    container.appendChild(actions);
  }


  /* ============================================================
     CHAT MESSAGE
     ============================================================ */

  function addMessage(text, who) {

    const msg =
      document.createElement("div");

    msg.className =
      `msg msg--${who}`;


    const meta =
      document.createElement("div");

    meta.className =
      "msg__meta";


    meta.textContent =
      who === "bot"
        ? `CBC 2.0 Assistant · ${nowLabel()}`
        : `You · ${nowLabel()}`;


    const bubble =
      document.createElement("div");

    bubble.className =
      "msg__bubble";


    /*
     * IMPORTANT:
     * Use innerHTML here because renderRichText()
     * converts links and structures long answers.
     */

    bubble.innerHTML =
      renderRichText(text);


    msg.append(
      meta,
      bubble
    );


    if (who === "bot") {
      addActionButtons(
        bubble,
        text
      );
    }


    thread.appendChild(msg);

    scrollToEnd();

    return msg;
  }


  /* ============================================================
     TYPING INDICATOR
     ============================================================ */

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


  /* ============================================================
     AMBIGUOUS HEAD DETECTION
     ============================================================ */

  function isAmbiguousHeadQuestion(text) {

    const q =
      String(text || "")
        .toLowerCase()
        .replace(/[?!.]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();


    if (!q) {
      return false;
    }


    /*
     * IMPORTANT:
     *
     * These are SPECIFIC roles.
     * If one of these is mentioned,
     * allow the backend to answer normally.
     */

    const specificRolePatterns = [

      /\btechnical\s+head\b/,
      /\bstage\s+head\b/,
      /\bcreative\s+head\b/,
      /\bsocial\s+media\s+head\b/,
      /\bhospitality\s+head\b/,
      /\bregistration\s+head\b/,
      /\bdiscipline\s+head\b/,
      /\blogistics\s+head\b/,

      /\btechnical\b/,
      /\bstage\b/,
      /\bcreative\b/,
      /\bsocial\s+media\b/,
      /\bhospitality\b/,
      /\bregistration\b/,
      /\bdiscipline\b/,
      /\blogistics\b/,

      /\bconvener\b/,
      /\bco[- ]?convener\b/,
      /\btreasurer\b/

    ];


    const hasSpecificRole =
      specificRolePatterns.some(
        (pattern) =>
          pattern.test(q)
      );


    /*
     * GENERIC HEAD QUESTIONS
     *
     * These must NOT be sent to the backend
     * because the backend may guess one head.
     *
     * Examples:
     *
     * "head"
     * "who is head"
     * "who is the head"
     * "who is the head of this"
     * "head of this"
     * "head of this event"
     * "who is the co-head"
     */

    const genericHeadQuestion =

      q === "head" ||

      q === "co-head" ||

      q === "co head" ||

      /\bwho\s+is\s+(the\s+)?(head|co[- ]?head)\b/.test(q) ||

      /\b(which\s+)?(head|co[- ]?head)\b/.test(q) ||

      /\b(head|co[- ]?head)\s+(of|for)\s+(this|this\s+event|the\s+event|cbc\s*2\.?0)\b/.test(q) ||

      /^head\s+of\s+(this|the\s+event|cbc\s*2\.?0)\b/.test(q) ||

      /^who\s+is\s+the\s+head\s+of\s+this\b/.test(q);


    return (
      genericHeadQuestion &&
      !hasSpecificRole
    );
  }


  /* ============================================================
     HEAD ROLES
     ============================================================ */

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


  /* ============================================================
     HEAD CLARIFICATION MESSAGE
     ============================================================ */

  function addHeadClarification() {

    const msg =
      document.createElement("div");

    msg.className =
      "msg msg--bot";


    const meta =
      document.createElement("div");

    meta.className =
      "msg__meta";

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
        Please choose one:
      </p>

      <div
        class="head-options"
        aria-label="Committee head options"
      ></div>
    `;


    const options =
      bubble.querySelector(
        ".head-options"
      );


    headRoles.forEach(
      ([label, query]) => {

        const button =
          document.createElement("button");

        button.type = "button";

        button.className =
          "head-option";

        button.textContent =
          label;


        button.addEventListener(
          "click",
          () => {

            sendMessage(query);

          }
        );


        options.appendChild(button);

      }
    );


    msg.append(
      meta,
      bubble
    );


    thread.appendChild(msg);

    scrollToEnd();
  }


  /* ============================================================
     SEND MESSAGE
     ============================================================ */

  async function sendMessage(rawText) {

    const text =
      String(rawText || "")
        .trim();


    if (!text) {
      return;
    }


    showChatView();

    addMessage(
      text,
      "user"
    );


    /*
     * CHECK FIRST
     *
     * This MUST happen BEFORE /api/chat.
     *
     * Therefore:
     *
     * User: "head"
     *
     * will NOT reach the backend.
     *
     * Instead, the assistant asks:
     *
     * "Which head are you looking for?"
     */

    if (
      isAmbiguousHeadQuestion(text)
    ) {

      addHeadClarification();

      return;
    }


    const typing =
      addTypingIndicator();


    try {

      const res =
        await fetch(
          "/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              message: text
            })
          }
        );


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


  /* ============================================================
     SIDEBAR EVENTS
     ============================================================ */

  sidebarToggle?.addEventListener(
    "click",
    () => {

      app.classList.contains(
        "sidebar-open"
      )
        ? closeSidebar()
        : openSidebar();

    }
  );


  sidebarOverlay?.addEventListener(
    "click",
    closeSidebar
  );


  /* ============================================================
     THEME BUTTON
     ============================================================ */

  themeToggle?.addEventListener(
    "click",
    () => {

      const next =
        document.documentElement.dataset.theme ===
        "dark"
          ? "light"
          : "dark";


      applyTheme(next);

    }
  );


  /* ============================================================
     NEW CHAT
     ============================================================ */

  newChatBtn?.addEventListener(
    "click",
    () => {

      showWelcomeView();

      closeSidebar();

    }
  );


  /* ============================================================
     WELCOME COMPOSER
     ============================================================ */

  composerWelcome?.addEventListener(
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


  /* ============================================================
     BOTTOM COMPOSER
     ============================================================ */

  composerBottom?.addEventListener(
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


  /* ============================================================
     SIDEBAR NAVIGATION
     ============================================================ */

  sidebarNav?.addEventListener(
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
        .querySelectorAll(
          ".nav-item"
        )
        .forEach(
          (el) =>
            el.classList.remove(
              "is-active"
            )
        );


      btn.classList.add(
        "is-active"
      );


      if (
        btn.dataset.action === "home"
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


  /* ============================================================
     QUICK ACTIONS
     ============================================================ */

  quickActions?.addEventListener(
    "click",
    (e) => {

      const btn =
        e.target.closest(
          ".quick-chip"
        );


      if (
        btn?.dataset.query
      ) {

        sendMessage(
          btn.dataset.query
        );

      }

    }
  );


  /* ============================================================
     INITIAL FOCUS
     ============================================================ */

  if (inputWelcome) {
    inputWelcome.focus();
  }

})();
