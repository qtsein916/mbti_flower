const byId = (id) => document.getElementById(id);
const screens = ["start", "quiz", "result"];
const plantTypes = Object.keys(plants);
const answers = Array(questions.length).fill(null);
let currentQuestion = 0;
let currentType = null;

function showScreen(screen, focusId) {
  for (const id of screens) byId(id).hidden = id !== screen;
  if (focusId) byId(focusId).focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function renderQuestion() {
  const [category, prompt, , ...choices] = questions[currentQuestion];
  byId("counter").textContent = `${currentQuestion + 1} / ${questions.length}`;
  byId("category").textContent = category;
  byId("question").textContent = prompt;
  const buttons = choices.map((choice, index) => {
    const button = document.createElement("button");
    const letter = document.createElement("span");
    button.type = "button";
    button.className = "choice";
    letter.className = "letter";
    letter.textContent = "AB"[index];
    letter.setAttribute("aria-hidden", "true");
    button.append(letter, choice);
    button.addEventListener("click", () => {
      answers[currentQuestion] = index;
      updateChoices();
    });
    return button;
  });
  byId("choices").replaceChildren(...buttons);
  byId("back").disabled = currentQuestion === 0;
  byId("next").textContent = currentQuestion === questions.length - 1 ? "내 꽃말 보기 ↗" : "다음 →";
  updateChoices();
  showScreen("quiz", "question");
}

function updateChoices() {
  const selected = answers[currentQuestion];
  Array.from(byId("choices").children).forEach((button, index) => {
    button.setAttribute("aria-pressed", String(index === selected));
  });
  byId("next").disabled = selected === null;
  byId("progress").value = answers.filter((answer) => answer !== null).length;
}

function calculateType(responses) {
  return axes.map(([first, second]) => {
    const selections = questions.flatMap(([, , letters], index) =>
      letters.includes(first) ? [letters[responses[index]]] : []
    );
    const firstCount = selections.filter((letter) => letter === first).length;
    // In a 2–2 tie, the first scenario for that axis decides.
    if (firstCount * 2 === selections.length) return selections[0];
    return firstCount * 2 > selections.length ? first : second;
  }).join("");
}

function renderResult(type, fromQuiz = false) {
  currentType = type;
  const [name, title, meaning, description] = plants[type];
  const index = plantTypes.indexOf(type);
  byId("type").textContent = type;
  byId("result-title").textContent = title;
  byId("flower-meaning").textContent = `“${meaning}”`;
  byId("description").textContent = description;
  byId("specimen").textContent = `SPECIMEN ${String(index + 1).padStart(2, "0")} / 16`;
  const photo = byId("plant-photo");
  photo.setAttribute("aria-label", `${name} 이미지`);
  photo.style.backgroundPosition = `${(index % 4) * 100 / 3}% ${Math.floor(index / 4) * 100 / 3}%`;

  const answerHint = byId("answer-hint");
  answerHint.hidden = !fromQuiz;
  if (fromQuiz) {
    const questionIndex = [8, 6, 13, 15].find((i) => type.includes(questions[i][2][answers[i]]))
      ?? questions.findIndex((question, i) => type.includes(question[2][answers[i]]));
    const question = questions[questionIndex];
    answerHint.textContent = `내 답에서 찾은 힌트 · ${question[0]}에서 “${question[3 + answers[questionIndex]]}”를 골랐어요.`;
  }
  byId("share-fallback").hidden = true;
  byId("share-status").textContent = "";
  showScreen("result", fromQuiz ? "result-title" : null);
}

async function shareResult() {
  const [name, , meaning, description] = plants[currentType];
  const summary = `꽃말은 핑계고 🌼 나를 닮은 식물은 ${name} (${currentType})!\n“${meaning}”\n${description}`;
  const webPage = location.protocol === "https:" || location.protocol === "http:";
  const resultUrl = new URL(location.href);
  resultUrl.hash = currentType;
  const copyText = webPage ? `${summary}\n${resultUrl.href}` : summary;
  const status = byId("share-status");
  const fallback = byId("share-fallback");
  fallback.hidden = true;
  status.textContent = "";

  if (navigator.share) {
    try {
      await navigator.share({
        title: "꽃말은 핑계고",
        text: summary,
        ...(webPage ? { url: resultUrl.href } : {}),
      });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(copyText);
    status.textContent = "공유할 결과를 복사했어요.";
  } catch {
    const field = byId("share-text");
    fallback.hidden = false;
    field.value = copyText;
    field.focus();
    field.select();
  }
}

function beginQuiz() {
  currentQuestion = 0;
  answers.fill(null);
  renderQuestion();
}

byId("start-button").addEventListener("click", beginQuiz);
byId("back").addEventListener("click", () => {
  if (currentQuestion === 0) return;
  currentQuestion -= 1;
  renderQuestion();
});
byId("next").addEventListener("click", () => {
  if (answers[currentQuestion] === null) return;
  if (currentQuestion === questions.length - 1) {
    renderResult(calculateType(answers), true);
    return;
  }
  currentQuestion += 1;
  renderQuestion();
});
byId("share").addEventListener("click", shareResult);
byId("restart").addEventListener("click", () => {
  answers.fill(null);
  currentQuestion = 0;
  currentType = null;
  if (location.hash) history.replaceState(null, "", location.href.split("#")[0]);
  showScreen("start", "start-button");
});

const sharedType = location.hash.slice(1);
if (plantTypes.includes(sharedType)) renderResult(sharedType);
