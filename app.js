import { db, auth } from "./firebase-config.js";
import {
  collection, addDoc, doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* =====================================================
   Visitor session doc
   Only stores what the visitor can see happening on the
   page (their Yes/No answer, message). No hidden
   device/location/timezone fingerprinting.
   ===================================================== */
let visitDocRef = null;
let visitStart = Date.now();
let noAttempts = 0;

async function initVisitorDoc(){
  try{
    await signInAnonymously(auth);
    visitDocRef = await addDoc(collection(db, "visitors"), {
      status: "pending",
      visitTime: serverTimestamp(),
      yesClicked: false,
      noClicked: false,
      noAttempts: 0,
      heartMessage: "",
      messageLength: 0,
      timeSpent: 0
    });
  }catch(err){
    console.warn("Could not start visitor session (Firebase not configured yet?):", err);
  }
}
initVisitorDoc();

window.addEventListener("beforeunload", () => {
  if(!visitDocRef) return;
  const seconds = Math.round((Date.now() - visitStart) / 1000);
  // best-effort; not guaranteed to complete on unload
  updateDoc(visitDocRef, { timeSpent: seconds }).catch(() => {});
});

/* =====================================================
   Screen navigation
   ===================================================== */
function showScreen(id){
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* =====================================================
   Loading screen
   ===================================================== */
const progressFill = document.getElementById("progressFill");
let progress = 0;
const loadingInterval = setInterval(() => {
  progress += Math.random() * 12 + 6;
  if(progress >= 100){
    progress = 100;
    clearInterval(loadingInterval);
    setTimeout(() => {
      showScreen("homeScreen");
      startTypewriter();
    }, 400);
  }
  progressFill.style.width = progress + "%";
}, 260);

/* =====================================================
   Typewriter effect
   ===================================================== */
function startTypewriter(){
  const el = document.getElementById("typewriterText");
  const text = "I made something only for you.";
  let i = 0;
  const openBtn = document.getElementById("openHeartBtn");
  const interval = setInterval(() => {
    el.textContent = text.slice(0, i + 1);
    i++;
    if(i >= text.length){
      clearInterval(interval);
      el.style.borderRight = "none";
      openBtn.disabled = false;
    }
  }, 55);
}

document.getElementById("openHeartBtn").addEventListener("click", () => {
  showScreen("loveScreen");
});

document.getElementById("toProposalBtn").addEventListener("click", () => {
  showScreen("proposalScreen");
});

/* =====================================================
   Proposal: dodging NO button
   ===================================================== */
const noBtn = document.getElementById("noBtn");
const yesBtn = document.getElementById("yesBtn");
const proposalRow = document.getElementById("proposalBtnRow");
const dodgeMessage = document.getElementById("dodgeMessage");

const dodgeLines = [
  "Are you sure? 🥺",
  "Think once more ❤️",
  "My heart thinks you smiled 😊",
  "Just a little more thought? 🥹",
  "I'll still respect your answer ❤️"
];

const MAX_DODGES = 5;

function moveNoButton(){
  if(noAttempts >= MAX_DODGES) return; // becomes normally clickable after this

  const rowRect = proposalRow.getBoundingClientRect();
  const btnW = noBtn.offsetWidth;
  const btnH = noBtn.offsetHeight;

  const maxX = window.innerWidth - btnW - 24;
  const maxY = window.innerHeight - btnH - 24;
  const newX = Math.max(12, Math.random() * maxX);
  const newY = Math.max(12, Math.random() * maxY);

  noBtn.style.position = "fixed";
  noBtn.style.left = newX + "px";
  noBtn.style.top = newY + "px";

  dodgeMessage.textContent = dodgeLines[noAttempts % dodgeLines.length];
  noAttempts++;

  if(visitDocRef){
    updateDoc(visitDocRef, { noAttempts }).catch(() => {});
  }

  if(noAttempts >= MAX_DODGES){
    dodgeMessage.textContent = "Okay — your choice, always. ❤️";
  }
}

noBtn.addEventListener("mouseenter", moveNoButton);
noBtn.addEventListener("touchstart", (e) => {
  if(noAttempts < MAX_DODGES){ e.preventDefault(); moveNoButton(); }
}, { passive:false });

noBtn.addEventListener("click", async (e) => {
  if(noAttempts < MAX_DODGES){
    e.preventDefault();
    moveNoButton();
    return;
  }
  // after MAX_DODGES, it's a real, clickable button —
  // respecting whatever she decides, no further scripted action.
  if(visitDocRef){
    await updateDoc(visitDocRef, { noClicked: true, status: "no" }).catch(() => {});
  }
});

yesBtn.addEventListener("click", async () => {
  if(visitDocRef){
    await updateDoc(visitDocRef, { yesClicked: true, status: "yes" }).catch(() => {});
  }
  showScreen("celebrationScreen");
  runCelebration();
});

document.getElementById("toLetterBtn").addEventListener("click", () => {
  stopCelebration();
  showScreen("letterScreen");
});

document.getElementById("toHerTurnBtn").addEventListener("click", () => {
  showScreen("herTurnScreen");
});

/* =====================================================
   Background music
   ===================================================== */
const bgMusic = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");
const musicIcon = document.getElementById("musicIcon");
let musicPlaying = false;

musicToggle.addEventListener("click", () => {
  if(musicPlaying){
    bgMusic.pause();
    musicIcon.textContent = "♪";
  }else{
    bgMusic.play().catch(() => {
      console.warn("Add an audio file at assets/audio/romantic-loop.mp3 to enable music.");
    });
    musicIcon.textContent = "❚❚";
  }
  musicPlaying = !musicPlaying;
});

/* =====================================================
   Floating hearts + sparkles background (canvas)
   ===================================================== */
const heartsCanvas = document.getElementById("bg-hearts");
const heartsCtx = heartsCanvas.getContext("2d");
const sparkCanvas = document.getElementById("bg-sparkles");
const sparkCtx = sparkCanvas.getContext("2d");

function resizeCanvases(){
  [heartsCanvas, sparkCanvas].forEach(c => {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  });
}
resizeCanvases();
window.addEventListener("resize", resizeCanvases);

const floatingHearts = Array.from({ length: 22 }, () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  size: 8 + Math.random() * 14,
  speed: 0.3 + Math.random() * 0.7,
  drift: (Math.random() - 0.5) * 0.5,
  opacity: 0.08 + Math.random() * 0.18
}));

function drawHeart(ctx, x, y, size, opacity, color){
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);
  ctx.scale(size / 20, size / 20);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(0, 2, -6, -4, -10, 2);
  ctx.bezierCurveTo(-14, 8, -6, 14, 0, 20);
  ctx.bezierCurveTo(6, 14, 14, 8, 10, 2);
  ctx.bezierCurveTo(6, -4, 0, 2, 0, 6);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

const sparkles = Array.from({ length: 40 }, () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: Math.random() * 1.6 + 0.4,
  twinkle: Math.random() * Math.PI * 2
}));

function animateBackground(){
  heartsCtx.clearRect(0, 0, heartsCanvas.width, heartsCanvas.height);
  floatingHearts.forEach(h => {
    h.y -= h.speed;
    h.x += h.drift;
    if(h.y < -20){ h.y = window.innerHeight + 20; h.x = Math.random() * window.innerWidth; }
    drawHeart(heartsCtx, h.x, h.y, h.size, h.opacity, "#ff6f9c");
  });

  sparkCtx.clearRect(0, 0, sparkCanvas.width, sparkCanvas.height);
  sparkles.forEach(s => {
    s.twinkle += 0.03;
    const alpha = (Math.sin(s.twinkle) + 1) / 2 * 0.7 + 0.1;
    sparkCtx.beginPath();
    sparkCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    sparkCtx.fillStyle = `rgba(255,255,255,${alpha})`;
    sparkCtx.fill();
  });

  requestAnimationFrame(animateBackground);
}
animateBackground();

/* =====================================================
   Celebration: confetti + heart burst + rose petals
   ===================================================== */
const confettiCanvas = document.getElementById("confettiCanvas");
const confettiCtx = confettiCanvas.getContext("2d");
let confettiPieces = [];
let celebrationRAF = null;

function sizeConfettiCanvas(){
  confettiCanvas.width = confettiCanvas.offsetWidth || window.innerWidth;
  confettiCanvas.height = confettiCanvas.offsetHeight || window.innerHeight;
}

function runCelebration(){
  sizeConfettiCanvas();
  const colors = ["#ff6f9c", "#e0264d", "#ffffff", "#ffd6e2"];
  confettiPieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -20 - Math.random() * confettiCanvas.height * 0.5,
    size: 5 + Math.random() * 6,
    speedY: 2 + Math.random() * 3,
    speedX: (Math.random() - 0.5) * 2,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 8,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));

  function tick(){
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiPieces.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;
      if(p.y > confettiCanvas.height + 20){
        p.y = -20;
        p.x = Math.random() * confettiCanvas.width;
      }
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      confettiCtx.restore();
    });
    celebrationRAF = requestAnimationFrame(tick);
  }
  tick();

  // rose petals overlay
  const petalLayer = document.getElementById("petalLayer");
  petalLayer.classList.add("active");
  petalLayer.innerHTML = "";
  for(let i = 0; i < 24; i++){
    const petal = document.createElement("span");
    petal.className = "petal";
    petal.textContent = "❤";
    petal.style.left = Math.random() * 100 + "vw";
    petal.style.animationDuration = 4 + Math.random() * 5 + "s";
    petal.style.animationDelay = Math.random() * 3 + "s";
    petal.style.fontSize = 14 + Math.random() * 14 + "px";
    petalLayer.appendChild(petal);
  }
}

function stopCelebration(){
  if(celebrationRAF) cancelAnimationFrame(celebrationRAF);
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  document.getElementById("petalLayer").classList.remove("active");
}

/* =====================================================
   Her message + character count
   ===================================================== */
const heartMessageEl = document.getElementById("heartMessage");
const charCountEl = document.getElementById("charCount");
heartMessageEl.addEventListener("input", () => {
  charCountEl.textContent = heartMessageEl.value.length;
});

/* =====================================================
   Send her message to Firestore
   ===================================================== */
const sendHeartBtn = document.getElementById("sendHeartBtn");
const sendStatus = document.getElementById("sendStatus");

sendHeartBtn.addEventListener("click", async () => {
  const message = heartMessageEl.value.trim();

  if(message.length < 20){
    sendStatus.textContent = "Please write at least 20 characters. ❤️";
    return;
  }

  sendHeartBtn.disabled = true;
  sendStatus.textContent = "Sending your heart...";

  try{
    if(visitDocRef){
      await updateDoc(visitDocRef, {
        heartMessage: message,
        messageLength: message.length,
        submittedAt: serverTimestamp()
      });
    }

    sendStatus.textContent = "Sent! Thank you for sharing your heart. ❤️";
    sendHeartBtn.textContent = "Sent ❤️";
  }catch(err){
    console.error(err);
    sendStatus.textContent = "Something went wrong — please try again.";
    sendHeartBtn.disabled = false;
  }
});
