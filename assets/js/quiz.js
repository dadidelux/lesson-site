(() => {
  "use strict";

  function startQuiz() {
    const mount = document.getElementById("quiz-mount");
    if (!mount) return;

    const showNote = (message) => {
      mount.replaceChildren();
      const note = document.createElement("p");
      note.className = "quiz-note";
      note.textContent = message;
      mount.append(note);
    };

    fetch("content/quizzes.json")
      .then((response) => {
        if (!response.ok) throw new Error("Quiz data unavailable");
        return response.json();
      })
      .then((data) => {
        const lessonId = new URLSearchParams(window.location.search).get("id");
        const quiz = lessonId && data && typeof data === "object" ? data[lessonId] : null;
        if (!quiz || !Array.isArray(quiz.questions) || !quiz.questions.length) return;

        const questions = quiz.questions.filter((q) =>
          q && typeof q.question === "string" && Array.isArray(q.choices) && q.choices.length === 4 &&
          Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < 4
        );
        if (!questions.length) return;

        function render() {
          mount.replaceChildren();
          mount.classList.add("quiz");
          let score = 0;
          let answered = 0;
          const heading = document.createElement("h2");
          heading.className = "quiz-title";
          heading.textContent = "Check your understanding";
          const status = document.createElement("p");
          status.className = "quiz-score";
          status.setAttribute("aria-live", "polite");
          status.textContent = `Score: 0 / ${questions.length}`;
          const list = document.createElement("div");
          list.className = "quiz-questions";
          const finish = document.createElement("p");
          finish.className = "quiz-finish";
          finish.setAttribute("aria-live", "polite");
          const reset = document.createElement("button");
          reset.type = "button";
          reset.className = "quiz-reset";
          reset.textContent = "Try again";
          reset.hidden = true;
          reset.addEventListener("click", render);

          questions.forEach((item, index) => {
            const fieldset = document.createElement("fieldset");
            fieldset.className = "quiz-question";
            const legend = document.createElement("legend");
            legend.textContent = `${index + 1}. ${item.question}`;
            fieldset.append(legend);

            const explanation = document.createElement("p");
            explanation.className = "quiz-explanation";
            explanation.hidden = true;
            const options = document.createElement("div");
            options.className = "quiz-options";

            item.choices.forEach((choice, choiceIndex) => {
              const label = document.createElement("label");
              label.className = "quiz-choice";
              const input = document.createElement("input");
              input.type = "radio";
              input.name = `quiz-${index}`;
              input.value = String(choiceIndex);
              input.addEventListener("change", () => {
                if (fieldset.disabled) return;
                fieldset.disabled = true;
                answered += 1;
                const correct = choiceIndex === item.answerIndex;
                if (correct) score += 1;
                options.querySelectorAll("label").forEach((choiceLabel, i) => {
                  if (i === item.answerIndex) choiceLabel.classList.add("is-correct");
                  if (i === choiceIndex && !correct) choiceLabel.classList.add("is-incorrect");
                });
                explanation.textContent = `${correct ? "Correct. " : "Not quite. "}${typeof item.explain === "string" ? item.explain : ""}`;
                explanation.hidden = false;
                status.textContent = `Score: ${score} / ${questions.length}`;
                if (answered === questions.length) {
                  const message = score === questions.length ? "Excellent work!" : score >= Math.ceil(questions.length / 2) ? "Nice work—review any explanations you missed." : "Good start—review the lesson and try again.";
                  finish.textContent = `Final score: ${score} / ${questions.length}. ${message}`;
                  reset.hidden = false;
                }
              });
              const text = document.createElement("span");
              text.textContent = typeof choice === "string" ? choice : "";
              label.append(input, text);
              options.append(label);
            });
            fieldset.append(options, explanation);
            list.append(fieldset);
          });
          mount.append(heading, status, list, finish, reset);
        }

        render();
      })
      .catch(() => showNote("The self-check quiz could not be loaded."));
  }

  let bootAttempts = 0;
  const boot = () => {
    if (document.getElementById("quiz-mount")) {
      startQuiz();
      return;
    }
    if (bootAttempts++ < 200) setTimeout(boot, 100);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
