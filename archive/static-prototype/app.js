const missionCards = document.querySelectorAll(".mission-card");
const missionTitle = document.getElementById("missionTitle");
const missionTag = document.getElementById("missionTag");
const chatLog = document.getElementById("chatLog");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const voiceBtn = document.getElementById("voiceBtn");
const completeChallengeBtn = document.getElementById("completeChallenge");
const streakCount = document.getElementById("streakCount");
const progressValue = document.getElementById("progressValue");
const meterFill = document.getElementById("meterFill");
const quizOptions = document.getElementById("quizOptions");
const quizFeedback = document.getElementById("quizFeedback");
const progressPanel = document.getElementById("progressPanel");
const startLearningBtn = document.getElementById("startLearning");

let progress = 45;
let streak = 3;
let selectedMission = "Math Quest";

const missionReplies = {
  "Math Quest": [
    "Great. Try this: if you have 6 apples and get 3 more, how many now?",
    "You are fast. Do you want a harder puzzle with shapes next?",
    "Nice solve. I can show a visual trick for adding numbers."
  ],
  "Word Wizard": [
    "Story time. Pick a word: brave, tiny, or rocket.",
    "Can you make a sentence with the word 'adventure'?",
    "Awesome. Want to build a silly poem in 2 lines?"
  ],
  "Science Lab": [
    "Question: why do shadows get longer near sunset?",
    "Want to run a mini experiment with water and paper?",
    "Great curiosity. I can explain gravity with a jumping ball."
  ]
};

const systemMessages = {
  "Math Quest": "Math mode ready. We will solve one quick puzzle at a time.",
  "Word Wizard": "Word mode ready. We can practice stories and spelling.",
  "Science Lab": "Science mode ready. Ask me any why or how question."
};

function appendBubble(text, type = "ai") {
  const bubble = document.createElement("article");
  bubble.className = `bubble ${type}`;
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function randomReply(mission) {
  const pool = missionReplies[mission];
  return pool[Math.floor(Math.random() * pool.length)];
}

function setMission(card) {
  missionCards.forEach((item) => item.classList.remove("active"));
  card.classList.add("active");

  selectedMission = card.dataset.mission;
  missionTitle.textContent = selectedMission;
  missionTag.textContent = card.dataset.level;
  document.documentElement.style.setProperty("--accent", card.dataset.color);

  appendBubble(systemMessages[selectedMission], "ai");
}

missionCards.forEach((card) => {
  card.addEventListener("click", () => setMission(card));
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  appendBubble(message, "kid");
  chatInput.value = "";

  setTimeout(() => {
    appendBubble(randomReply(selectedMission), "ai");
  }, 360);
});

voiceBtn.addEventListener("click", () => {
  appendBubble("Mic mode is demo-only in this prototype. Type your question below.", "ai");
});

completeChallengeBtn.addEventListener("click", () => {
  streak += 1;
  progress = Math.min(100, progress + 12);
  streakCount.textContent = String(streak);
  progressValue.textContent = `${progress}%`;
  meterFill.style.width = `${progress}%`;

  const focusBadge = document.querySelector('[data-badge="focus"]');
  const geniusBadge = document.querySelector('[data-badge="genius"]');
  if (progress >= 60) focusBadge.classList.remove("locked");
  if (progress >= 85) geniusBadge.classList.remove("locked");

  appendBubble("Challenge complete. You earned stars and leveled up.", "ai");
  createSparkBurst(progressPanel);
});

quizOptions.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const all = quizOptions.querySelectorAll("button");
  all.forEach((button) => {
    button.classList.remove("selected", "correct", "wrong");
  });

  target.classList.add("selected");
  const isCorrect = target.dataset.correct === "true";

  if (isCorrect) {
    target.classList.add("correct");
    quizFeedback.textContent = "Correct! You just earned bonus points.";
    progress = Math.min(100, progress + 6);
    progressValue.textContent = `${progress}%`;
    meterFill.style.width = `${progress}%`;
    createSparkBurst(progressPanel);
  } else {
    target.classList.add("wrong");
    quizFeedback.textContent = "Good try. Hint: 8 + 4 is one more than 11.";
  }
});

startLearningBtn.addEventListener("click", () => {
  document.getElementById("missions").scrollIntoView({ behavior: "smooth" });
  appendBubble("Pick a mission card to start a new adventure.", "ai");
});

function createSparkBurst(container) {
  const colors = ["#ff8c42", "#2ec4b6", "#f15bb5", "#ffd166", "#14345b"];
  for (let i = 0; i < 18; i += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.background = colors[i % colors.length];
    spark.style.left = `${8 + Math.random() * 84}%`;
    spark.style.top = `${20 + Math.random() * 60}%`;
    spark.style.transform = `translateY(${Math.random() * 20}px) rotate(${Math.random() * 140}deg)`;
    spark.style.animationDelay = `${Math.random() * 0.2}s`;
    container.appendChild(spark);

    setTimeout(() => {
      spark.remove();
    }, 1000);
  }
}

document.querySelectorAll(".reveal").forEach((item, index) => {
  item.style.setProperty("--delay", `${index * 0.12}s`);
});

meterFill.style.width = `${progress}%`;
