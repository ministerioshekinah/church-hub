/* Editorial reminders only. This module never stores, fetches, or changes content. */
(() => {
  "use strict";
  const text = value => typeof value === "string" ? value.trim() : "";
  const normalize = value => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'").replace(/\s+/g, " ").toLowerCase().replace(/[.!]+$/, "");
  const templates = new Set([
    "Add this week's scripture passage here.",
    "Add church news, reminders, ministry updates, or upcoming activities here.",
    "Agrega aquí el pasaje bíblico de esta semana.",
    "Agrega aquí noticias de la iglesia, recordatorios, actualizaciones de ministerios o próximas actividades."
  ].map(normalize));
  const standard = [["gathering", "Sunday gathering"], ["scripture", "Weekly scripture"], ["community", "Community update"]];

  function review(data = {}, optional = []) {
    data = data && typeof data === "object" ? data : {};
    const items = [];
    const add = (kind, message, field, language, index) => items.push({ kind, message, field, language, index });
    if (!text(data.issue_date)) add("required", "Choose an issue date before saving.", "issueDate");
    for (const language of ["en", "es"]) {
      if (!text(data[`title_${language}`])) add("required", `Add the ${language === "en" ? "English" : "Spanish"} newsletter title before saving.`, language === "en" ? "titleEn" : "titleEs", language);
    }
    const sections = standard.map(([key, label]) => ({ key, label, body_en: text(data[`${key}_en`]), body_es: text(data[`${key}_es`]) }));
    if (Array.isArray(optional)) optional.forEach((section, index) => {
      if (!section || typeof section !== "object") return;
      sections.push({ index, type: section.type, label: `Additional section ${index + 1}`, title_en: text(section.title_en), title_es: text(section.title_es), body_en: text(section.body_en), body_es: text(section.body_es) });
    });
    if (!sections.some(section => section.body_en || section.body_es)) add("empty", "This issue has no message yet. Add content before publishing.", "gatheringEn", "en");
    for (const section of sections) {
      const field = language => section.key ? `${section.key}${language === "en" ? "En" : "Es"}` : `body_${language}`;
      for (const language of ["en", "es"]) {
        const label = language === "en" ? "English" : "Spanish";
        if (templates.has(normalize(section[`body_${language}`]))) add("template", `${section.label} (${label}) still contains template text. Replace it with this week's content.`, field(language), language, section.index);
        if (section.type === "custom" && section[`body_${language}`] && !section[`title_${language}`]) add("heading", `${section.label} (${label}) has no heading. Add one to help readers find it.`, `title_${language}`, language, section.index);
      }
      if (section.body_en && !section.body_es) add("translation", `${section.label} has no Spanish text. Spanish readers will see the English message.`, field("es"), "es", section.index);
      if (section.body_es && !section.body_en) add("translation", `${section.label} has no English text. English readers will not see this message.`, field("en"), "en", section.index);
    }
    for (const language of ["en", "es"]) {
      let hasImportant = false;
      for (const section of sections) {
        const body = section[`body_${language}`] || (language === "es" ? section.body_en : "");
        if (section.type !== "important_announcement" || !body) continue;
        if (hasImportant) add("hidden", `Additional section ${section.index + 1} is another important announcement in ${language === "en" ? "English" : "Spanish"}. Only the first appears on the website. Combine the messages or use another section type.`, section[`body_${language}`] ? `body_${language}` : "body_en", language, section.index);
        hasImportant = true;
      }
    }
    return items;
  }
  const api = Object.freeze({ review });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.SHEKINAH_CONTENT_REVIEW = api;
})();
