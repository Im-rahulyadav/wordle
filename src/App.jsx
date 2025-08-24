import React, { useEffect, useMemo, useRef, useState } from "react";
import words from "./words.json";  

const DICTIONARY = words.dictionary;
const ANSWERS = words.answers;

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;


const KEYS_ROW_1 = ["Q","W","E","R","T","Y","U","I","O","P"];
const KEYS_ROW_2 = ["A","S","D","F","G","H","J","K","L"];
const KEYS_ROW_3 = ["Enter","Z","X","C","V","B","N","M","Backspace"];

const pickRandom = () => ANSWERS[Math.floor(Math.random() * ANSWERS.length)].toLowerCase();

function getStoredState() {
  try {
    const raw = localStorage.getItem("wordle-state");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeState(state) {
  try {
    localStorage.setItem("wordle-state", JSON.stringify(state));
  } catch {}
}

function evaluateGuess(guess, answer) {
  // Returns array of statuses: "correct", "present", "absent"
  const res = Array(WORD_LENGTH).fill("absent");
  const answerArr = answer.split("");
  const guessArr = guess.split("");

  // First pass: correct positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === answerArr[i]) {
      res[i] = "correct";
      answerArr[i] = null; // consume
      guessArr[i] = null;
    }
  }
  // Second pass: present letters
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i]) {
      const idx = answerArr.indexOf(guessArr[i]);
      if (idx !== -1) {
        res[i] = "present";
        answerArr[idx] = null;
      }
    }
  }
  return res;
}

function mergeKeyStatuses(existing, guess, statuses) {
  // Priority: correct > present > absent
  const priority = { absent: 0, present: 1, correct: 2 };
  const next = { ...existing };
  guess.split("").forEach((ch, i) => {
    const s = statuses[i];
    const prev = next[ch];
    if (!prev || priority[s] > priority[prev]) next[ch] = s;
  });
  return next;
}

export default function App() {
  const [answer, setAnswer] = useState(() => getStoredState()?.answer || pickRandom());
  const [guesses, setGuesses] = useState(() => getStoredState()?.guesses || []);
  const [current, setCurrent] = useState("");
  const [statuses, setStatuses] = useState(() => getStoredState()?.statuses || {});
  const [message, setMessage] = useState("");
  const [gameOver, setGameOver] = useState(() => getStoredState()?.gameOver || false);

  const inputRef = useRef(null);

  const boardRows = useMemo(() => {
    const rows = [...guesses];
    if (!gameOver && rows.length < MAX_GUESSES) rows.push(current);
    while (rows.length < MAX_GUESSES) rows.push("");
    return rows;
  }, [guesses, current, gameOver]);

  useEffect(() => {
    storeState({ answer, guesses, statuses, gameOver });
  }, [answer, guesses, statuses, gameOver]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (gameOver) return;
      const key = e.key;
      if (/^[a-zA-Z]$/.test(key) && current.length < WORD_LENGTH) {
        setCurrent((c) => c + key.toLowerCase());
      } else if (key === "Backspace") {
        setCurrent((c) => c.slice(0, -1));
      } else if (key === "Enter") {
        onEnter();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, gameOver]);

  function setToast(text) {
    setMessage(text);
    if (text) setTimeout(() => setMessage(""), 1400);
  }

  function onEnter() {
  if (gameOver) return;
  if (current.length !== WORD_LENGTH) {
    setToast("Not enough letters");
    return;
  }
  if (!DICTIONARY.includes(current.toLowerCase())) {
    setToast("Not in word list");
    return;
  }

  const guess = current.toLowerCase();   // ✅ normalize here
  const evals = evaluateGuess(guess, answer.toLowerCase());
  const newStatuses = mergeKeyStatuses(statuses, guess, evals);
  const newGuesses = [...guesses, guess];   // ✅ store lowercase only

  setStatuses(newStatuses);
  setGuesses(newGuesses);
  setCurrent("");

  if (guess === answer.toLowerCase()) {
    setGameOver(true);
    setToast("You got it!");
  } else if (newGuesses.length === MAX_GUESSES) {
    setGameOver(true);
    setToast(`Answer: ${answer.toUpperCase()}`);
  }
}


  function onKeyPress(k) {
    if (k === "Enter") return onEnter();
    if (k === "Backspace") return setCurrent((c) => c.slice(0, -1));
    if (/^[A-Z]$/.test(k) && current.length < WORD_LENGTH && !gameOver) {
      setCurrent((c) => c + k);
    }
  }

  function newGame() {
    const next = pickRandom();
    setAnswer(next);
    setGuesses([]);
    setCurrent("");
    setStatuses({});
    setGameOver(false);
    setToast("New game!");
    storeState({ answer: next, guesses: [], statuses: {}, gameOver: false });
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center">
      <header className="w-full border-b border-white/10 sticky top-0 backdrop-blur bg-gray-950/70">
        <div className="mx-auto max-w-xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-widest">Wordle</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={newGame}
              className="px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-[0.98] transition"
            >
              New Game
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      <div className="h-8 mt-3">
        {message && (
          <div className="px-3 py-1 rounded-xl bg-white/10 text-sm shadow">
            {message}
          </div>
        )}
      </div>

      {/* Board */}
      <main className="mt-4 w-full flex justify-center">
        <div className="w-full max-w-xl px-4">
          <div className="grid grid-rows-6 gap-2">
            {boardRows.map((row, rIdx) => {
              const isSubmitted = rIdx < guesses.length;
              const letters = row.padEnd(WORD_LENGTH).split("").slice(0, WORD_LENGTH);
              const evals = isSubmitted ? evaluateGuess(guesses[rIdx], answer) : [];

              return (
                <div key={rIdx} className="grid grid-cols-5 gap-2">
                  {letters.map((ch, cIdx) => {
                    let state = "";
                    if (isSubmitted) state = evals[cIdx];
                    else if (rIdx === guesses.length && cIdx < current.length) state = "filled";

                    const base =
                      "aspect-square rounded-xl border text-2xl font-bold grid place-items-center select-none";
                    const byState = {
                      "": "border-white/15 bg-gray-900",
                      filled: "border-white/25 bg-gray-800",
                      correct: "border-transparent bg-green-600 text-white",
                      present: "border-transparent bg-yellow-600 text-white",
                      absent: "border-transparent bg-gray-700 text-white",
                    };

                    return (
                      <div key={cIdx} className={`${base} ${byState[state]}`}>{ch.toUpperCase()}</div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Keyboard */}
          <div className="mt-6 space-y-2 select-none">
            {[KEYS_ROW_1, KEYS_ROW_2, KEYS_ROW_3].map((row, idx) => (
              <div key={idx} className="flex gap-1 justify-center">
                {row.map((k) => {
                  const isAction = k === "Enter" || k === "Backspace";
                  const label = k === "Backspace" ? "⌫" : k;
                  const s = statuses[k.toLowerCase()];

                  const base =
                    "px-2 py-3 rounded-xl text-sm font-semibold flex-1 max-w-[44px] grid place-items-center border active:scale-[0.98] transition";
                  const byStatus = {
                    undefined: "bg-gray-800 border-white/10",
                    absent: "bg-gray-700 border-transparent",
                    present: "bg-yellow-600 border-transparent",
                    correct: "bg-green-600 border-transparent",
                  };

                  return (
                    <button
                      key={k}
                      onClick={() => onKeyPress(k)}
                      className={`${base} ${byStatus[s]} ${isAction ? "flex-[1.4] max-w-[68px]" : ""}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Invisible input to hint mobile keyboards if needed */}
          <input
            ref={inputRef}
            inputMode="text"
            className="opacity-0 absolute pointer-events-none"
            value={current}
            onChange={() => {}}
          />

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-white/60">
            {gameOver ? (
              <div>
                <p className="mb-1">{`Answer: ${answer}`}</p>
                <button
                  onClick={newGame}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20"
                >
                  Play Again
                </button>
              </div>
            ) : (
              <p>Guess the {WORD_LENGTH}-letter word in {MAX_GUESSES} tries.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
