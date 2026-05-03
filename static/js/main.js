/* ═══════════════════════════════════════════════
   PlagiaGuard – Frontend JavaScript
   ═══════════════════════════════════════════════ */

"use strict";

// ── SAMPLE TEXTS ──────────────────────────────
const SAMPLE_A = `Machine learning is a subfield of artificial intelligence that enables computers to learn from data without being explicitly programmed. It involves the development of algorithms and statistical models that allow computer systems to improve their performance on a specific task through experience.

Deep learning, a subset of machine learning, uses neural networks with many layers to model complex patterns in data. These deep neural networks have revolutionized fields such as computer vision, natural language processing, and speech recognition.

The training process in machine learning involves feeding large amounts of data into algorithms that can identify patterns and make decisions. Supervised learning, unsupervised learning, and reinforcement learning are the three main paradigms used in machine learning.

Gradient descent is a fundamental optimization algorithm used to minimize the loss function during training neural networks. By iteratively adjusting the weights of the network, the model gradually learns to make better predictions.`;

const SAMPLE_B = `Machine learning is an area of artificial intelligence that allows computers to learn and adapt from data without needing to be explicitly programmed for every task. It focuses on building algorithms and statistical approaches that help systems get better at tasks through practical experience.

Deep learning represents a specialized branch of machine learning, utilizing neural networks with multiple processing layers to capture intricate patterns. These sophisticated neural architectures have transformed domains including computer vision, language understanding, and voice recognition technologies.

The learning process requires exposing algorithms to vast datasets so they can discover underlying patterns and make informed decisions. There are three primary learning approaches: supervised, unsupervised, and reinforcement learning methodologies.

Gradient descent serves as a core optimization technique employed to reduce the loss function when training neural networks. Through repeated adjustment of network weights, models progressively improve their ability to generate accurate predictions.`;

// ── STATE ──────────────────────────────────────
let analysisResult = null;

// ── INIT ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupTextareas();
  setupButtons();
  setupUploadZones();
  checkServerHealth();
  injectSVGDefs();
});

// ── FILE UPLOAD ────────────────────────────────
function setupUploadZones() {
  ["A", "B"].forEach(side => {
    const zone   = document.getElementById(`uploadZone${side}`);
    const input  = document.getElementById(`file${side}`);
    const target = zone.dataset.target; // "docA" or "docB"

    // File-picker change
    input.addEventListener("change", () => {
      if (input.files[0]) handleFileUpload(input.files[0], target, side);
    });

    // Drag events
    zone.addEventListener("dragover", e => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", e => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file, target, side);
    });
  });
}

async function handleFileUpload(file, textareaId, side) {
  const statusEl = document.getElementById(`uploadStatus${side}`);
  const allowed  = [".pdf", ".docx", ".doc"];
  const ext      = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

  if (!allowed.includes(ext)) {
    setUploadStatus(statusEl, `❌ Unsupported type: ${ext}. Use .pdf or .docx`, "error");
    return;
  }

  setUploadStatus(statusEl, `⏳ Extracting text from "${file.name}"…`, "loading");

  const form = new FormData();
  form.append("file", file);

  try {
    const res  = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) {
      setUploadStatus(statusEl, `❌ ${data.error || "Upload failed."}`, "error");
      return;
    }

    const ta = document.getElementById(textareaId);
    ta.value = data.text;
    ta.dispatchEvent(new Event("input"));

    // Brief flash animation
    ta.style.transition = "background 0.4s";
    ta.style.background = "rgba(124,110,245,0.07)";
    setTimeout(() => { ta.style.background = ""; }, 700);

    setUploadStatus(
      statusEl,
      `✅ "${data.filename}" loaded — ${data.chars.toLocaleString()} chars`,
      "success"
    );
  } catch (err) {
    setUploadStatus(statusEl, `❌ Network error: ${err.message}`, "error");
  }
}

function setUploadStatus(el, msg, type) {
  el.textContent = msg;
  el.className   = `upload-status ${type}`;
}


function injectSVGDefs() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.innerHTML = `
    <defs>
      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7c6ef5"/>
        <stop offset="100%" stop-color="#22d3ee"/>
      </linearGradient>
    </defs>`;
  document.body.prepend(svg);
}

// ── SERVER HEALTH ──────────────────────────────
async function checkServerHealth() {
  const dot = document.getElementById("serverStatus");
  try {
    const res = await fetch("/api/health", { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      dot.classList.add("online");
      dot.title = "Server online";
    } else throw new Error();
  } catch {
    dot.classList.add("offline");
    dot.title = "Server offline";
  }
}

// ── TEXTAREA COUNTERS ─────────────────────────
function setupTextareas() {
  const docA = document.getElementById("docA");
  const docB = document.getElementById("docB");

  docA.addEventListener("input", () => updateCount("docA", "countA"));
  docB.addEventListener("input", () => updateCount("docB", "countB"));
}

function updateCount(textareaId, countId) {
  const ta = document.getElementById(textareaId);
  const text = ta.value.trim();
  const chars = text.length;
  const sentences = text
    ? text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10).length
    : 0;
  document.getElementById(countId).textContent = `${chars.toLocaleString()} chars · ${sentences} sentences`;
}

// ── BUTTONS ───────────────────────────────────
function setupButtons() {
  // Sample buttons
  document.querySelectorAll(".btn-sample").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      const ta = document.getElementById(target);
      ta.value = target === "docA" ? SAMPLE_A : SAMPLE_B;
      ta.dispatchEvent(new Event("input"));
      ta.style.transition = "background 0.4s";
      ta.style.background = "rgba(124,110,245,0.05)";
      setTimeout(() => { ta.style.background = ""; }, 600);
    });
  });

  // Clear buttons
  document.querySelectorAll(".btn-clear").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      const ta = document.getElementById(target);
      ta.value = "";
      ta.dispatchEvent(new Event("input"));
    });
  });
}

// ── MAIN ANALYSIS ─────────────────────────────
async function runAnalysis() {
  const textA = document.getElementById("docA").value.trim();
  const textB = document.getElementById("docB").value.trim();

  if (!textA || !textB) {
    showToast("Please fill in both Document A and Document B.", "error");
    return;
  }
  if (textA.length < 30 || textB.length < 30) {
    showToast("Documents are too short. Please add more content.", "error");
    return;
  }

  setLoading(true);
  document.getElementById("resultsSection").style.display = "none";

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text_a: textA, text_b: textB }),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Analysis failed.", "error");
      return;
    }

    analysisResult = data;
    renderResults(data);

    setTimeout(() => {
      document.getElementById("resultsSection").scrollIntoView({ behavior: "smooth" });
    }, 200);

  } catch (err) {
    showToast("Network error: " + err.message, "error");
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  const btn = document.getElementById("analyzeBtn");
  const txt = document.getElementById("btnText");
  if (on) {
    btn.classList.add("loading");
    btn.disabled = true;
    txt.textContent = "Analyzing...";
  } else {
    btn.classList.remove("loading");
    btn.disabled = false;
    txt.textContent = "Analyze for Plagiarism";
  }
}

// ── RENDER RESULTS ────────────────────────────
function renderResults(data) {
  const section = document.getElementById("resultsSection");

  renderScoreRing(data.overall_score);
  renderVerdict(data);
  renderStats(data);
  renderAnnotatedDoc(data.sentence_labels);
  renderMatches(data.matches);
  renderStyleAnalysis(data.style_note, data);
  renderSummary(data);
  renderConclusion(data);

  section.style.display = "block";
}

// Score ring
function renderScoreRing(pct) {
  const ring = document.getElementById("ringFill");
  const scoreEl = document.getElementById("scorePercent");
  const circumference = 2 * Math.PI * 50; // r=50
  const offset = circumference - (pct / 100) * circumference;

  scoreEl.textContent = "0%";
  ring.style.strokeDashoffset = circumference;

  requestAnimationFrame(() => {
    setTimeout(() => {
      ring.style.strokeDashoffset = offset;
      animateCounter(scoreEl, 0, pct, 1400, v => `${v.toFixed(1)}%`);
    }, 100);
  });

  // Color ring based on score
  const color = pct >= 75 ? "#ef4444" : pct >= 45 ? "#f59e0b" : "#22c55e";
  ring.style.stroke = color;
}

function animateCounter(el, from, to, duration, fmt = v => v) {
  const start = performance.now();
  function step(ts) {
    const progress = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = fmt(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Verdict
function renderVerdict(data) {
  const badge = document.getElementById("verdictBadge");
  const details = document.getElementById("scoreDetails");

  const colors = {
    High: { text: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.35)" },
    Moderate: { text: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" },
    Low: { text: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)" },
  };
  const c = colors[data.verdict] || colors.Low;

  badge.style.color = c.text;
  badge.style.background = c.bg;
  badge.style.borderColor = c.border;
  badge.textContent = `${data.verdict} Plagiarism Risk`;

  details.innerHTML = `
    <div class="score-detail-row">📄 Doc A: <strong>${data.total_sentences_a}</strong> sentences</div>
    <div class="score-detail-row">📄 Doc B: <strong>${data.total_sentences_b}</strong> sentences</div>
    <div class="score-detail-row">⚡ Similarity: <strong>${data.overall_score}%</strong></div>
    <div class="score-detail-row">📌 Plagiarized: <strong>${data.plagiarized_pct}%</strong> of Doc B</div>
  `;
}

// Stats
function renderStats(data) {
  const row = document.getElementById("statsRow");
  const items = [
    { val: data.plagiarized_pct + "%", label: "Plagiarized", color: "#ef4444" },
    { val: data.direct_count, label: "Direct Copies", color: "#ef4444" },
    { val: data.paraphrased_count, label: "Paraphrased", color: "#f59e0b" },
    { val: data.original_count, label: "Original Sentences", color: "#22c55e" },
    { val: data.total_sentences_b, label: "Total Sentences B", color: "#7c6ef5" },
  ];
  row.innerHTML = items.map(i => `
    <div class="stat-mini">
      <span class="stat-mini-num" style="color:${i.color}">${i.val}</span>
      <span class="stat-mini-label">${i.label}</span>
    </div>
  `).join("");
}

// Annotated Document
function renderAnnotatedDoc(labels) {
  const el = document.getElementById("annotatedDoc");
  if (!labels || !labels.length) {
    el.textContent = "No sentences to display.";
    return;
  }
  el.innerHTML = labels.map(item => {
    const cls = item.label === "Direct" ? "direct"
               : item.label === "Paraphrased" ? "paraphrased"
               : "original";
    const tooltip = `[${item.label}] Similarity: ${(item.score * 100).toFixed(1)}%`;
    return `<span class="sent-span ${cls}" title="${escapeHtml(tooltip)}">${escapeHtml(item.sentence)} </span>`;
  }).join("");
}

// Matches
function renderMatches(matches) {
  const block = document.getElementById("matchedBlock");
  const list = document.getElementById("matchesList");
  const badge = document.getElementById("matchCountBadge");

  if (!matches || !matches.length) {
    block.style.display = "none";
    return;
  }

  block.style.display = "block";
  badge.textContent = `${matches.length} match${matches.length !== 1 ? "es" : ""}`;

  list.innerHTML = matches.map((m, idx) => {
    const pct = (m.score * 100).toFixed(1);
    const barColor = m.type === "Direct" ? "#ef4444" : "#f59e0b";
    return `
      <div class="match-card">
        <div class="match-card-header">
          <span class="match-type-badge ${m.type}">${m.type} Plagiarism</span>
          <div class="match-bar-outer">
            <div class="match-bar-inner" style="width:${pct}%;background:${barColor}"></div>
          </div>
          <span class="match-score">Score: ${pct}%</span>
        </div>
        <div class="match-bodies">
          <div class="match-body">
            <div class="match-body-label">Document A (Reference)</div>
            <p>${escapeHtml(m.sent_a)}</p>
          </div>
          <div class="match-body">
            <div class="match-body-label">Document B (Suspected)</div>
            <p>${escapeHtml(m.sent_b)}</p>
          </div>
        </div>
      </div>`;
  }).join("");
}

// Style Analysis
function renderStyleAnalysis(style, data) {
  const grid = document.getElementById("analysisGrid");
  if (!style) return;

  const aiColor = style.ai_probability === "Possible" ? "#f59e0b" : "#22c55e";
  const hintsHtml = style.hints
    .map(h => `<li>${escapeHtml(h)}</li>`)
    .join("");

  grid.innerHTML = `
    <div class="analysis-card">
      <div class="analysis-card-title">AI-Generated Content</div>
      <div class="analysis-card-value" style="color:${aiColor}">${style.ai_probability}</div>
      <div class="analysis-card-sub">Based on linguistic patterns</div>
    </div>
    <div class="analysis-card">
      <div class="analysis-card-title">Lexical Diversity</div>
      <div class="analysis-card-value">${(style.lexical_diversity * 100).toFixed(1)}%</div>
      <div class="analysis-card-sub">Unique word ratio in Doc B</div>
    </div>
    <div class="analysis-card">
      <div class="analysis-card-title">Avg. Sentence Length</div>
      <div class="analysis-card-value">${style.avg_sentence_length} <span style="font-size:0.9rem;font-weight:500">words</span></div>
      <div class="analysis-card-sub">Doc A avg: ${data.avg_sent_len_a} · Doc B avg: ${data.avg_sent_len_b}</div>
    </div>
    <div class="analysis-card" style="grid-column: 1 / -1">
      <div class="analysis-card-title">Analysis Notes</div>
      <ul class="ai-hint-list">${hintsHtml}</ul>
    </div>
  `;
}

// Summary
function renderSummary(data) {
  const el = document.getElementById("summaryContent");
  el.innerHTML = `
    <div class="summary-item">
      <div class="summary-item-label">Total Plagiarized %</div>
      <div class="summary-item-val" style="color:#ef4444">${data.plagiarized_pct}%</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">Directly Copied</div>
      <div class="summary-item-val" style="color:#ef4444">${data.direct_count}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">Paraphrased</div>
      <div class="summary-item-val" style="color:#f59e0b">${data.paraphrased_count}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">Original Sentences</div>
      <div class="summary-item-val" style="color:#22c55e">${data.original_count}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">Overall Similarity</div>
      <div class="summary-item-val" style="color:#7c6ef5">${data.overall_score}%</div>
    </div>
  `;
}

// Conclusion
function renderConclusion(data) {
  const block = document.getElementById("conclusionBlock");
  const verdictTexts = {
    High: {
      color: "#ef4444",
      bg: "rgba(239,68,68,0.08)",
      title: "✅ Conclusion",
      verdict: "⚠️ High Plagiarism Risk Detected",
      body: `Document B shows significant semantic overlap with Document A. With ${data.plagiarized_pct}% of sentences classified as plagiarized (${data.direct_count} direct and ${data.paraphrased_count} paraphrased), this submission is likely derived from the reference document. Immediate review is strongly recommended.`,
    },
    Moderate: {
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      title: "✅ Conclusion",
      verdict: "⚡ Moderate Plagiarism Risk",
      body: `Document B shows moderate semantic similarity to Document A. With ${data.plagiarized_pct}% of content flagged (${data.direct_count} direct copies, ${data.paraphrased_count} paraphrased sections), some portions appear to be derived or reworded from the reference. Review flagged sections carefully.`,
    },
    Low: {
      color: "#22c55e",
      bg: "rgba(34,197,94,0.06)",
      title: "✅ Conclusion",
      verdict: "✔ Low Plagiarism Risk",
      body: `Document B appears to be largely original with respect to Document A. Only ${data.plagiarized_pct}% of content was flagged. While minor thematic overlaps exist (${data.direct_count + data.paraphrased_count} sentence${data.direct_count + data.paraphrased_count !== 1 ? "s" : ""}), the documents are semantically distinct. The submission is likely original work.`,
    },
  };

  const v = verdictTexts[data.verdict] || verdictTexts.Low;
  block.style.color = v.color;
  block.style.background = v.bg;
  block.style.borderColor = v.color + "55";
  block.innerHTML = `
    <div class="conclusion-title">${v.title}</div>
    <div class="conclusion-verdict">${v.verdict}</div>
    <div class="conclusion-body">${v.body}</div>
  `;
}

// ── UTILITY ───────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(msg, type = "info") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function scrollToInput() {
  document.querySelector(".input-section").scrollIntoView({ behavior: "smooth" });
}
