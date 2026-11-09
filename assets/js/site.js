(() => {
  "use strict";
  const DATA_URL = "content/lessons.json";
  const PROGRESS_KEY = "llm-lessons-progress";
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const safeHTML = (value = "") => {
    const template = document.createElement("template");
    template.innerHTML = value;
    const allowed = new Set(["P", "UL", "OL", "LI", "STRONG", "EM", "BLOCKQUOTE", "CODE", "A"]);
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (!allowed.has(child.tagName)) { child.replaceWith(...child.childNodes); return; }
          [...child.attributes].forEach((attr) => {
            if (child.tagName !== "A" || !["href", "title"].includes(attr.name.toLowerCase())) child.removeAttribute(attr.name);
          });
          if (child.tagName === "A") {
            const href = child.getAttribute("href") || "";
            if (!/^(https?:|mailto:|#|\/)/i.test(href)) child.removeAttribute("href");
            child.setAttribute("rel", "noopener noreferrer");
          }
          walk(child);
        } else if (child.nodeType !== Node.TEXT_NODE) child.remove();
      });
    };
    walk(template.content);
    return template.innerHTML;
  };
  const readProgress = () => {
    try { const value = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "[]"); return Array.isArray(value) ? value : []; }
    catch { return []; }
  };
  const writeProgress = (ids) => { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify([...new Set(ids)])); } catch { /* progress remains usable in this view */ } };
  const wordCount = (lesson) => {
    const source = [lesson.summary, ...(lesson.sections || []).map((s) => s.html)].join(" ").replace(/<[^>]*>/g, " ");
    return source.trim().split(/\s+/).filter(Boolean).length;
  };
  const readTime = (lesson) => Math.max(1, Math.ceil(wordCount(lesson) / 220));
  const chapterFor = (data, lesson) => data.chapters.find((chapter) => chapter.id === lesson.chapter) || data.chapters.find((chapter) => (chapter.lessonIds || []).includes(lesson.id));
  const accentClass = (number) => `chapter-${Math.max(1, Math.min(5, Number(number) || 1))}`;

  async function getData() {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Content request failed (${response.status})`);
    return response.json();
  }
  function setProgress(data) {
    const complete = readProgress();
    const total = data.lessons.length;
    const count = data.lessons.filter((lesson) => complete.includes(lesson.id)).length;
    const label = $("#progress-count");
    const bar = $(".progress-track");
    if (label) label.textContent = `${count} / ${total} lessons`;
    if (bar) { bar.setAttribute("aria-valuemax", String(total)); bar.setAttribute("aria-valuenow", String(count)); }
    const fill = $("#progress-fill");
    if (fill) fill.style.width = `${total ? Math.round(count / total * 100) : 0}%`;
  }
  function renderCourse(data) {
    const course = data.course || {};
    $("#course-title").innerHTML = course.title ? escapeHTML(course.title).replace(/LLMs?/i, "<em>$&</em>") : "How to use<br><em>LLMs</em>";
    $("#course-subtitle").textContent = course.subtitle || "A field guide to thinking with language models.";
    $("#course-description").textContent = course.description || "A practical course in getting more from large language models.";
    $("#course-attribution").textContent = course.attribution || "Inspired by Andrej Karpathy's talk.";
    $("#footer-attribution").textContent = course.attribution || "Based on Andrej Karpathy's segmented talk.";
    const root = $("#course-content");
    const complete = readProgress();
    root.innerHTML = data.chapters.map((chapter, index) => {
      const lessons = (chapter.lessonIds || []).map((id) => data.lessons.find((item) => item.id === id)).filter(Boolean);
      return `<section class="chapter ${accentClass(index + 1)}" aria-labelledby="chapter-${escapeHTML(chapter.id)}"><header class="chapter-heading"><span class="chapter-number">${String(chapter.number ?? index + 1).padStart(2, "0")}</span><h2 id="chapter-${escapeHTML(chapter.id)}">${escapeHTML(chapter.title)}</h2><p class="chapter-tagline">${escapeHTML(chapter.tagline || "")}</p></header><div class="lesson-grid">${lessons.map((lesson) => {
        const image = lesson.images?.[0];
        return `<article class="lesson-card ${complete.includes(lesson.id) ? "is-complete" : ""}"><a class="lesson-card-link" href="lesson.html?id=${encodeURIComponent(lesson.id)}">${image?.src ? `<img class="card-image" src="${escapeHTML(image.src)}" alt="${escapeHTML(image.caption || lesson.title)}" loading="lazy">` : ""}<div class="card-body"><div class="card-topline"><span>LESSON ${String(lesson.number).padStart(2, "0")}</span><span class="complete-mark" aria-label="${complete.includes(lesson.id) ? "Completed" : "Not completed"}">✓</span></div><h3 class="card-title">${escapeHTML(lesson.title)}</h3><p class="card-summary">${escapeHTML(lesson.summary || "")}</p><div class="card-meta">${readTime(lesson)} MIN READ</div></div></a></article>`;
      }).join("")}</div></section>`;
    }).join("");
    const glossary = $("#glossary-list");
    const terms = data.glossary || [];
    glossary.innerHTML = terms.length ? terms.map((item) => `<article class="glossary-item"><h3>${escapeHTML(item.term)}</h3><p>${escapeHTML(item.definition)}</p>${item.cite ? `<cite>${escapeHTML(item.cite)}</cite>` : ""}</article>`).join("") : `<p class="loading-note">The glossary is on its way.</p>`;
    setProgress(data);
    window.addEventListener("storage", (event) => { if (event.key === PROGRESS_KEY) { renderCourse(data); } }, { once: true });
  }
  function listBlock(title, items, className = "") {
    if (!items?.length) return "";
    return `<section class="lesson-block ${className}"><h2>${escapeHTML(title)}</h2><ul>${items.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul></section>`;
  }
  function renderLesson(data) {
    const id = new URLSearchParams(location.search).get("id");
    const lesson = data.lessons.find((item) => item.id === id);
    const root = $("#lesson-root");
    if (!lesson) { showError(root, "We couldn't find that lesson", "Choose a lesson from the course index and pick up where you left off."); return; }
    const chapter = chapterFor(data, lesson);
    const order = data.lessons;
    const position = order.findIndex((item) => item.id === lesson.id);
    const previous = order[position - 1];
    const next = order[position + 1];
    const chapterIndex = Math.max(0, data.chapters.indexOf(chapter));
    const complete = readProgress().includes(lesson.id);
    const media = [...(lesson.images || []).map((item) => ({ ...item, kind: "image" })), ...(lesson.gifs || []).map((item) => ({ ...item, kind: "gif" }))];
    root.innerHTML = `<article class="lesson-column ${accentClass(chapter?.number || chapterIndex + 1)}" style="--chapter:var(--chapter-${chapterIndex + 1})"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Course</a><span>/</span><a href="index.html#chapter-${escapeHTML(chapter?.id || "")}">${escapeHTML(chapter?.title || "Lessons")}</a><span>/</span>Lesson ${String(lesson.number).padStart(2, "0")}</nav><header><p class="lesson-kicker">${escapeHTML(chapter?.number ? `CHAPTER ${String(chapter.number).padStart(2,"0")}` : "LESSON")} · ${escapeHTML(lesson.segmentKey || `LESSON ${lesson.number}`)}</p><h1 class="lesson-title">${escapeHTML(lesson.title)}</h1><p class="lesson-summary">${escapeHTML(lesson.summary || "")}</p><div class="lesson-actions"><button class="complete-button" type="button" aria-pressed="${complete}">${complete ? "✓ COMPLETED" : "MARK COMPLETE"}</button><span class="read-time">${readTime(lesson)} MIN READ</span></div></header><hr class="lesson-rule">${lesson.objectives?.length ? `<section class="objectives"><h2>What you'll learn</h2><ul>${lesson.objectives.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul></section>` : ""}${(lesson.sections || []).map((section) => `<section class="lesson-block"><h2>${escapeHTML(section.heading)}</h2><div class="lesson-prose">${safeHTML(section.html)}</div></section>`).join("")}${lesson.quotes?.length ? `<section class="lesson-block"><h2>In Karpathy's words</h2>${lesson.quotes.map((quote) => `<figure class="quote-card"><blockquote>${escapeHTML(quote.text)}</blockquote><figcaption><cite>${escapeHTML(quote.cite || "Andrej Karpathy")}</cite></figcaption></figure>`).join("")}</section>` : ""}${media.length ? `<section class="lesson-block"><h2>From the talk</h2><div class="media-grid">${media.map((item) => `<figure class="media-figure"><img src="${escapeHTML(item.src)}" alt="${escapeHTML(item.caption || lesson.title)}" loading="lazy">${item.caption || item.timestamp ? `<figcaption>${item.timestamp ? `<time>${escapeHTML(item.timestamp)}</time> · ` : ""}${escapeHTML(item.caption || "")}</figcaption>` : ""}</figure>`).join("")}</div></section>` : ""}${listBlock("Watch for", lesson.pitfalls, "pitfalls")}${listBlock("Takeaways", lesson.takeaways, "takeaway-panel")}${listBlock("Try it yourself", lesson.practice, "practice") }<div id="quiz-mount"></div><nav class="lesson-nav" aria-label="Lesson navigation">${previous ? `<a class="previous" href="lesson.html?id=${encodeURIComponent(previous.id)}"><span class="nav-label">← PREVIOUS LESSON</span><span class="nav-title">${escapeHTML(previous.title)}</span></a>` : `<span class="nav-empty" aria-hidden="true"></span>`}${next ? `<a class="next" href="lesson.html?id=${encodeURIComponent(next.id)}"><span class="nav-label">NEXT LESSON →</span><span class="nav-title">${escapeHTML(next.title)}</span></a>` : `<a class="next" href="index.html"><span class="nav-label">COURSE COMPLETE</span><span class="nav-title">Back to all lessons ↗</span></a>`}</nav></article>`;
    root.querySelector(".complete-button").addEventListener("click", (event) => {
      const ids = readProgress();
      const isDone = ids.includes(lesson.id);
      writeProgress(isDone ? ids.filter((value) => value !== lesson.id) : [...ids, lesson.id]);
      event.currentTarget.setAttribute("aria-pressed", String(!isDone));
      event.currentTarget.textContent = isDone ? "MARK COMPLETE" : "✓ COMPLETED";
    });
  }
  function showError(root, title, message) {
    root.innerHTML = `<section class="error-card"><p class="eyebrow">A SMALL DETOUR</p><h1>${escapeHTML(title)}</h1><p>${escapeHTML(message)}</p><a href="index.html">Return to the course index →</a></section>`;
  }
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const data = await getData();
      if (document.body.dataset.page === "course") renderCourse(data);
      else renderLesson(data);
    } catch (error) {
      const root = $(document.body.dataset.page === "course" ? "#course-content" : "#lesson-root");
      if (root) showError(root, "Your notes aren't here yet", "We couldn't load the course content. Please try again in a moment.");
      console.error("Unable to load course content", error);
    }
  });
})();
