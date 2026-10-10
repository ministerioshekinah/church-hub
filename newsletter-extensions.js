(() => {
  if (!document.querySelector('link[href^="newsletter-extensions.css"]')) {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "newsletter-extensions.css?v=1.0";
  document.head.appendChild(stylesheet);
  }

  const SECTION_TYPES = {
    ministry_spotlight: {
      label: "Ministry Spotlight",
      title_en: "Ministry Spotlight",
      title_es: "Ministerio Destacado"
    },
    celebrations: {
      label: "Birthdays & Celebrations",
      title_en: "Birthdays & Celebrations",
      title_es: "Cumpleaños y Celebraciones"
    },
    important_announcement: {
      label: "Important Announcement",
      title_en: "Important Announcement",
      title_es: "Anuncio Importante"
    },
    custom: {
      label: "Custom Section",
      title_en: "",
      title_es: ""
    }
  };

  function makeSection(type) {
    const defaults = Object.hasOwn(SECTION_TYPES, type) ? SECTION_TYPES[type] : SECTION_TYPES.custom;
    const randomPart =
      window.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return {
      id: `section-${randomPart}`,
      type: Object.hasOwn(SECTION_TYPES, type) ? type : "custom",
      title_en: defaults.title_en,
      title_es: defaults.title_es,
      body_en: "",
      body_es: ""
    };
  }

  function normalizeSections(value) {
    if (!Array.isArray(value)) return [];

    return value
      .filter((section) => section && typeof section === "object" && !Array.isArray(section))
      .map((section) => ({
        id: String(section.id || `section-${Date.now()}-${Math.random().toString(16).slice(2)}`),
        type: Object.hasOwn(SECTION_TYPES, section.type) ? section.type : "custom",
        title_en: String(section.title_en || ""),
        title_es: String(section.title_es || ""),
        body_en: String(section.body_en || ""),
        body_es: String(section.body_es || "")
      }));
  }

  function optionalHeading(section, language) {
    const isSpanish = language === "es";
    const fallback = Object.hasOwn(SECTION_TYPES, section.type) ? SECTION_TYPES[section.type] : SECTION_TYPES.custom;
    return (
      section[isSpanish ? "title_es" : "title_en"] ||
      section.title_en ||
      fallback[isSpanish ? "title_es" : "title_en"] ||
      (isSpanish ? "Sección" : "Section")
    );
  }

  function optionalBody(section, language) {
    const isSpanish = language === "es";
    return section[isSpanish ? "body_es" : "body_en"] || section.body_en || "";
  }

  function initAdminExtensions() {
    if (typeof newsletterFormData !== "function" || typeof persistNewsletter !== "function") {
      return;
    }

    let optionalSections = [];

    const languagePanels = Array.from(
      document.querySelectorAll(".editor-language-panel")
    );
    const lastLanguagePanel = languagePanels.at(-1);
    if (!lastLanguagePanel) return;

    const builder = document.createElement("section");
    builder.className = "newsletter-optional-builder";
    builder.innerHTML = `
      <div class="optional-builder-heading">
        <div>
          <p class="card-label">Optional content</p>
          <h3>Additional Newsletter Sections</h3>
          <p>Add only what you need for this issue. Empty optional sections are never shown publicly.</p>
        </div>
      </div>
      <div class="optional-add-buttons" aria-label="Add optional newsletter section">
        <button type="button" class="button admin-button-secondary" data-add-optional="ministry_spotlight">+ Ministry Spotlight</button>
        <button type="button" class="button admin-button-secondary" data-add-optional="celebrations">+ Birthdays & Celebrations</button>
        <button type="button" class="button admin-button-secondary" data-add-optional="important_announcement">+ Important Announcement</button>
        <button type="button" class="button admin-button-secondary" data-add-optional="custom">+ Custom Section</button>
      </div>
      <div class="optional-section-list" id="optionalSectionList"></div>
    `;
    lastLanguagePanel.insertAdjacentElement("afterend", builder);

    const previewBody = document.querySelector(".preview-newsletter-body");
    const previewBanner = document.createElement("div");
    previewBanner.id = "previewOptionalBanner";
    const previewExtras = document.createElement("div");
    previewExtras.id = "previewOptionalSections";
    previewBody?.prepend(previewBanner);
    previewBody?.append(previewExtras);

    const list = builder.querySelector("#optionalSectionList");

    function syncFromDom() {
      const cards = Array.from(list.querySelectorAll("[data-optional-id]"));
      optionalSections = cards.map((card) => ({
        id: card.dataset.optionalId,
        type: SECTION_TYPES[card.dataset.optionalType]
          ? card.dataset.optionalType
          : "custom",
        title_en: card.querySelector('[data-field="title_en"]')?.value.trim() || "",
        title_es: card.querySelector('[data-field="title_es"]')?.value.trim() || "",
        body_en: card.querySelector('[data-field="body_en"]')?.value.trim() || "",
        body_es: card.querySelector('[data-field="body_es"]')?.value.trim() || ""
      }));
      return optionalSections;
    }

    function renderEditor() {
      if (!optionalSections.length) {
        list.innerHTML = `
          <div class="optional-empty-state">
            No optional sections added to this newsletter.
          </div>
        `;
        return;
      }

      list.innerHTML = optionalSections
        .map((section, index) => {
          const typeInfo = Object.hasOwn(SECTION_TYPES, section.type) ? SECTION_TYPES[section.type] : SECTION_TYPES.custom;
          return `
            <article class="optional-section-card" data-optional-id="${escapeAdminHtml(section.id)}" data-optional-type="${escapeAdminHtml(section.type)}">
              <div class="optional-section-card-heading">
                <div>
                  <span class="optional-section-number">${index + 1}</span>
                  <strong>${escapeAdminHtml(typeInfo.label)}</strong>
                </div>
                <button type="button" class="optional-remove-button" data-remove-optional="${escapeAdminHtml(section.id)}">Remove</button>
              </div>

              <div class="optional-language-grid">
                <div class="optional-language-column">
                  <span class="optional-language-label">English</span>
                  <label>
                    Section title
                    <input type="text" data-field="title_en" value="${escapeAdminHtml(section.title_en)}" />
                  </label>
                  <label>
                    Content
                    <textarea data-field="body_en">${escapeAdminHtml(section.body_en)}</textarea>
                  </label>
                </div>

                <div class="optional-language-column">
                  <span class="optional-language-label">Español</span>
                  <label>
                    Título de la sección
                    <input type="text" data-field="title_es" value="${escapeAdminHtml(section.title_es)}" />
                  </label>
                  <label>
                    Contenido
                    <textarea data-field="body_es">${escapeAdminHtml(section.body_es)}</textarea>
                  </label>
                </div>
              </div>
            </article>
          `;
        })
        .join("");
    }

    function renderPreview() {
      const language = activeEditorLanguage();
      const banner = optionalSections.find(
        (section) => section.type === "important_announcement" && optionalBody(section, language)
      );

      if (previewBanner) {
        previewBanner.innerHTML = banner
          ? `
            <section class="preview-important-banner">
              <strong>${escapeAdminHtml(optionalHeading(banner, language))}</strong>
              <p>${escapeAdminHtml(optionalBody(banner, language))}</p>
            </section>
          `
          : "";
      }

      if (previewExtras) {
        previewExtras.innerHTML = optionalSections
          .filter(
            (section) =>
              section.type !== "important_announcement" &&
              optionalBody(section, language)
          )
          .map(
            (section) => `
              <section class="preview-section optional-preview-section">
                <h4>${escapeAdminHtml(optionalHeading(section, language))}</h4>
                <p>${escapeAdminHtml(optionalBody(section, language))}</p>
              </section>
            `
          )
          .join("");
      }
    }

    builder.addEventListener("click", (event) => {
      const addButton = event.target.closest("[data-add-optional]");
      if (addButton) {
        syncFromDom();
        optionalSections.push(makeSection(addButton.dataset.addOptional));
        renderEditor();
        renderPreview();
        return;
      }

      const removeButton = event.target.closest("[data-remove-optional]");
      if (removeButton) {
        syncFromDom();
        optionalSections = optionalSections.filter(
          (section) => section.id !== removeButton.dataset.removeOptional
        );
        renderEditor();
        renderPreview();
      }
    });

    builder.addEventListener("input", () => {
      syncFromDom();
      renderPreview();
    });

    const originalSelectNewsletter = selectNewsletter;
    selectNewsletter = function (id) {
      originalSelectNewsletter(id);
      const item = adminNewsletters.find((newsletter) => newsletter.id === id);
      optionalSections = normalizeSections(item?.optional_sections);
      renderEditor();
      renderPreview();
    };

    document.getElementById("newNewsletterButton")?.addEventListener("click", () => {
      optionalSections = [];
      renderEditor();
      renderPreview();
    });

    const originalUpdateNewsletterPreview = updateNewsletterPreview;
    updateNewsletterPreview = function () {
      originalUpdateNewsletterPreview();
      renderPreview();
    };

    persistNewsletter = async function (targetStatus = null) {
      if (!authenticatedAdmin) return null;

      const data = validateNewsletterForm();
      if (!data) return null;

      const currentStatus =
        document.getElementById("issueStatus").value || "draft";
      const status = targetStatus || currentStatus;
      const id = selectedNewsletterId || data.issue_date;

      if (selectedNewsletterIsNew) {
        const dateConflict = adminNewsletters.some(
          (item) => item.issue_date === data.issue_date
        );
        if (dateConflict) {
          document.getElementById("draftStatus").textContent =
            "A newsletter already exists for that issue date.";
          return null;
        }
      }

      const existing = adminNewsletters.find(
        (item) => item.id === selectedNewsletterId
      );
      const sections = syncFromDom();

      const payload = {
        id,
        issue_date: data.issue_date,
        status,
        title_en: data.title_en,
        title_es: data.title_es,
        gathering_en: data.gathering_en,
        gathering_es: data.gathering_es,
        scripture_en: data.scripture_en,
        scripture_es: data.scripture_es,
        community_en: data.community_en,
        community_es: data.community_es,
        optional_sections: sections,



        published_at:
          status === "published"
            ? existing?.published_at || new Date().toISOString()
            : null
      };

      const { data: saved, error } = await supabaseClient
        .from("newsletters")
        .upsert(payload, { onConflict: "id" })
        .select("id,status")
        .single();

      if (error) {
        console.error(error);
        document.getElementById("draftStatus").textContent =
          `Could not save newsletter: ${error.message}`;
        return null;
      }

      selectedNewsletterId = saved.id;
      selectedNewsletterIsNew = false;
      await loadNewsletterEditor();
      selectNewsletter(saved.id);
      return saved;
    };

    renderEditor();
    renderPreview();
  }

  function initPublicExtensions() {
    if (
      typeof publicConfigReady !== "function" ||
      typeof publicSupabaseRequest !== "function" ||
      typeof renderNewsletterPage !== "function"
    ) {
      return;
    }

    const originalDatabaseMapper = databaseNewsletterToDisplayIssue;

    databaseNewsletterToDisplayIssue = function (row) {
      const issue = originalDatabaseMapper(row);
      issue.optional_sections = normalizeSections(row.optional_sections);
      return issue;
    };

    renderNewsletter = function (issue, container) {
      const title = issue[`title_${currentLanguage}`] || issue.title_en;
      const date = issue[`date_${currentLanguage}`] || issue.date_en;
      const sections = issue.sections || [];
      const optionalSections = normalizeSections(issue.optional_sections);
      const banner = optionalSections.find(
        (section) =>
          section.type === "important_announcement" &&
          optionalBody(section, currentLanguage)
      );

      const standardOptionalSections = optionalSections.filter(
        (section) =>
          section.type !== "important_announcement" &&
          optionalBody(section, currentLanguage)
      );

      container.innerHTML = `
        <span class="tag">${escapeHtml(translations[currentLanguage].latest_issue)}</span>
        <h2>${escapeHtml(title)}</h2>
        <p class="issue-date">${escapeHtml(date)}</p>
        ${
          banner
            ? `
              <section class="newsletter-important-banner">
                <span>${escapeHtml(
                  currentLanguage === "es" ? "Importante" : "Important"
                )}</span>
                <h3>${escapeHtml(optionalHeading(banner, currentLanguage))}</h3>
                <p>${escapeHtml(optionalBody(banner, currentLanguage))}</p>
              </section>
            `
            : ""
        }
        ${sections
          .map((section) => {
            const heading =
              section[`heading_${currentLanguage}`] || section.heading_en;
            const body = section[`body_${currentLanguage}`] || section.body_en;

            return `
              <section class="newsletter-section">
                <h3>${escapeHtml(heading)}</h3>
                <p>${escapeHtml(body)}</p>
              </section>
            `;
          })
          .join("")}
        ${standardOptionalSections
          .map(
            (section) => `
              <section class="newsletter-section newsletter-optional-section">
                <h3>${escapeHtml(optionalHeading(section, currentLanguage))}</h3>
                <p>${escapeHtml(optionalBody(section, currentLanguage))}</p>
              </section>
            `
          )
          .join("")}
      `;
    };

    loadNewsletters = async function () {
      const latestContainer = document.getElementById("latestNewsletter");
      const archiveContainer = document.getElementById("newsletterArchive");
      if (!latestContainer || !archiveContainer) return;

      try {
        let issues;

        if (publicConfigReady()) {
          const rows = await publicSupabaseRequest(
            "newsletters",
            "?select=id,issue_date,title_en,title_es,gathering_en,gathering_es,scripture_en,scripture_es,community_en,community_es,optional_sections,published_at&status=eq.published&published_at=not.is.null&order=issue_date.desc&limit=100"
          );
          issues = (rows || []).map(databaseNewsletterToDisplayIssue);
        } else {
          const response = await fetch("newsletters.json", { cache: "no-store" });
          if (!response.ok) throw new Error("Static newsletter fallback failed.");
          issues = await response.json();
        }

        cachedNewsletterIssues = issues;
        renderNewsletterPage(issues);
      } catch (error) {
        console.error("Unable to load extended newsletters:", error);
        latestContainer.innerHTML =
          `<p>${escapeHtml(translations[currentLanguage].newsletter_error)}</p>`;
        archiveContainer.innerHTML = "";
      }
    };

    // The page bootstrap performs the one initial request after this extension registers.
  }

  if (document.body.classList.contains("admin-body")) {
    initAdminExtensions();
  }

  if (document.body.dataset.page === "newsletter") {
    initPublicExtensions();
  }
})();
