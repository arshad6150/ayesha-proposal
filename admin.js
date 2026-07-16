import { db, auth } from "./firebase-config.js";
import {
  collection, getDocs, deleteDoc, doc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* =====================================================
   IMPORTANT — SECURITY NOTE
   This page must NOT be relied on alone to protect data.
   Real protection comes from your Firestore security rules
   (see README.md), which should only allow reads to a
   signed-in admin UID/email — not to anonymous visitors.
   Create the admin user in:
   Firebase Console → Authentication → Users → Add user
   ===================================================== */

const loginWrap = document.getElementById("loginWrap");
const dashboard = document.getElementById("dashboard");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginError = document.getElementById("loginError");

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  loginError.textContent = "";
  try{
    await signInWithEmailAndPassword(auth, email, password);
  }catch(err){
    loginError.textContent = "Incorrect email or password.";
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

let allVisitors = [];

onAuthStateChanged(auth, async (user) => {
  if(user){
    loginWrap.style.display = "none";
    dashboard.style.display = "block";
    await loadVisitors();
  }else{
    loginWrap.style.display = "flex";
    dashboard.style.display = "none";
  }
});

async function loadVisitors(){
  const list = document.getElementById("visitorList");
  list.innerHTML = `<div class="empty-state">Loading visitors...</div>`;
  try{
    const q = query(collection(db, "visitors"), orderBy("visitTime", "desc"));
    const snap = await getDocs(q);
    allVisitors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStats(allVisitors);
    renderList(allVisitors);
  }catch(err){
    list.innerHTML = `<div class="empty-state">Could not load visitors. Check Firestore rules / config.</div>`;
    console.error(err);
  }
}

function renderStats(visitors){
  const total = visitors.length;
  const yesCount = visitors.filter(v => v.yesClicked).length;
  const pending = total - yesCount;
  const avgTime = total
    ? Math.round(visitors.reduce((sum, v) => sum + (v.timeSpent || 0), 0) / total)
    : 0;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statYes").textContent = yesCount;
  document.getElementById("statNo").textContent = pending;
  document.getElementById("statAvgTime").textContent = avgTime + "s";
}

function formatDate(ts){
  if(!ts || !ts.toDate) return "—";
  return ts.toDate().toLocaleString();
}

function renderList(visitors){
  const list = document.getElementById("visitorList");
  if(visitors.length === 0){
    list.innerHTML = `<div class="empty-state">No visitors yet.</div>`;
    return;
  }

  list.innerHTML = "";
  visitors.forEach(v => {
    const card = document.createElement("div");
    card.className = "visitor-card";

    const tagLabel = v.yesClicked ? "YES ❤️" : (v.noClicked ? "NO" : "PENDING");
    const tagClass = v.yesClicked ? "yes" : (v.noClicked ? "no" : "pending");

    card.innerHTML = `
      <div class="visitor-head">
        <strong>${formatDate(v.visitTime)}</strong>
        <span class="tag ${tagClass}">${tagLabel}</span>
      </div>
      <div class="visitor-meta">
        <span>⏱ ${v.timeSpent || 0}s on page</span>
        <span>🔁 ${v.noAttempts || 0} no-attempts</span>
        <span>✉️ ${v.messageLength || 0} chars</span>
      </div>
      ${v.heartMessage ? `<div class="visitor-message">${escapeHtml(v.heartMessage)}</div>` : ""}
      <div class="visitor-actions">
        <button class="delete-btn" data-id="${v.id}">Delete entry</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-id");
      if(!confirm("Delete this visitor entry permanently?")) return;
      await deleteDoc(doc(db, "visitors", id));
      await loadVisitors();
    });
  });
}

function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* Filters + search */
document.getElementById("searchInput").addEventListener("input", applyFilters);
document.getElementById("filterSelect").addEventListener("change", applyFilters);

function applyFilters(){
  const term = document.getElementById("searchInput").value.toLowerCase();
  const filter = document.getElementById("filterSelect").value;

  let filtered = allVisitors.filter(v =>
    (v.heartMessage || "").toLowerCase().includes(term)
  );

  if(filter === "yes") filtered = filtered.filter(v => v.yesClicked);
  if(filter === "pending") filtered = filtered.filter(v => !v.yesClicked && !v.noClicked);

  renderList(filtered);
}

/* CSV export */
document.getElementById("exportCsvBtn").addEventListener("click", () => {
  const headers = ["visitTime", "status", "yesClicked", "noClicked", "noAttempts", "timeSpent", "messageLength", "heartMessage"];
  const rows = allVisitors.map(v => [
    formatDate(v.visitTime),
    v.status || (v.yesClicked ? "yes" : v.noClicked ? "no" : "pending"),
    v.yesClicked ? "YES" : "",
    v.noClicked ? "NO" : "",
    v.noAttempts || 0,
    v.timeSpent || 0,
    v.messageLength || 0,
    `"${(v.heartMessage || "").replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "visitors.csv";
  a.click();
  URL.revokeObjectURL(url);
});
