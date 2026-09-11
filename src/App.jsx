import { useState } from "react";
import "./App.css";

const starterGoals = [
  {
    id: "starter-1",
    name: "Submit Project Orbit",
    category: "Career",
    priority: "high",
    timeframe: "This week",
    deadline: "Thursday",
    details: "Finish and submit the competition prototype.",
  },
  {
    id: "starter-2",
    name: "Be more active",
    category: "Health",
    priority: "medium",
    timeframe: "Ongoing",
    deadline: "",
    details: "Make movement part of the week.",
  },
  {
    id: "starter-3",
    name: "Post consistently",
    category: "Creator",
    priority: "medium",
    timeframe: "This month",
    deadline: "",
    details: "Make time for creator work.",
  },
];

const initialSchedule = {
  Sunday: [
    {
      time: "10:00 AM",
      title: "Work on Project Orbit",
      type: "Focus block",
      flexibility: "flexible",
      className: "lavender-event",
    },
    {
      time: "3:30 PM",
      title: "Gym",
      type: "Health goal · Flexible",
      flexibility: "flexible",
      className: "blue-event",
    },
    {
      time: "7:00 PM",
      title: "Edit creator reel",
      type: "Creator goal · Flexible",
      flexibility: "flexible",
      className: "pink-event",
    },
  ],

  Monday: [
    {
      time: "10:00 AM",
      title: "Project Orbit build",
      type: "Focus block",
      flexibility: "flexible",
      className: "lavender-event",
    },
    {
      time: "2:00 PM",
      title: "Open time",
      type: "Available",
      flexibility: "open",
      className: "soft-event",
    },
  ],

  Tuesday: [
    {
      time: "11:00 AM",
      title: "Project deadline work",
      type: "Focus block",
      flexibility: "flexible",
      className: "lavender-event",
    },
    {
      time: "6:00 PM",
      title: "Walk",
      type: "Health goal · Flexible",
      flexibility: "flexible",
      className: "blue-event",
    },
  ],

  Wednesday: [
    {
      time: "12:00 PM",
      title: "Test Project Orbit",
      type: "Focus block",
      flexibility: "flexible",
      className: "lavender-event",
    },
    {
      time: "4:30 PM",
      title: "Career application",
      type: "Career · Flexible",
      flexibility: "flexible",
      className: "gold-event",
    },
  ],

  Thursday: [
    {
      time: "5:00 PM",
      title: "Submit Project Orbit",
      type: "Hard deadline",
      flexibility: "fixed",
      className: "lavender-event",
    },
    {
      time: "7:00 PM",
      title: "Rest block",
      type: "Recovery",
      flexibility: "protected",
      className: "blue-event",
    },
  ],

  Friday: [
    {
      time: "3:00 PM",
      title: "Creator work",
      type: "Creative · Flexible",
      flexibility: "flexible",
      className: "pink-event",
    },
    {
      time: "6:00 PM",
      title: "Open time",
      type: "Available",
      flexibility: "open",
      className: "soft-event",
    },
  ],

  Saturday: [
    {
      time: "2:00 PM",
      title: "Open time",
      type: "Available",
      flexibility: "open",
      className: "soft-event",
    },
  ],
};

function App() {
  const [activePage, setActivePage] = useState("home");
  const [scheduleView, setScheduleView] = useState("week");

  const [schedule, setSchedule] = useState(initialSchedule);

  const [goals, setGoals] = useState([]);
  const [preferences, setPreferences] = useState([]);

  const [goalInput, setGoalInput] = useState("");

  const [goalSummary, setGoalSummary] = useState("");
  const [isBuildingContext, setIsBuildingContext] =
    useState(false);
  const [goalError, setGoalError] = useState("");

  const [message, setMessage] = useState("");
  const [originalMessage, setOriginalMessage] =
    useState("");

  const [orbitoResult, setOrbitoResult] =
    useState(null);

  const [orbitoError, setOrbitoError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [recalibrated, setRecalibrated] =
    useState(false);

  const resetDemo = () => {
    setSchedule(initialSchedule);
    setGoals([]);
    setPreferences([]);
    setGoalInput("");
    setGoalSummary("");
    setGoalError("");
    setIsBuildingContext(false);

    setMessage("");
    setOriginalMessage("");
    setOrbitoResult(null);
    setOrbitoError("");
    setIsLoading(false);

    setRecalibrated(false);

    setActivePage("home");
    setScheduleView("week");
  };

  /*
  =========================================================
  GOOGLE GEMINI
  =========================================================
  */

  const buildOrbitContext = async () => {
    if (!goalInput.trim()) {
      setGoalError(
        "Tell Orbit what you're working toward first.",
      );
      return;
    }

    setIsBuildingContext(true);
    setGoalError("");

    try {
      const response = await fetch(
        "http://localhost:3001/api/orbit-context",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            message: goalInput,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Orbit could not understand your goals.",
        );
      }

      setGoals(data.context.goals || []);
      setPreferences(
        data.context.preferences || [],
      );
      setGoalSummary(
        data.context.summary || "",
      );
    } catch (error) {
      setGoalError(error.message);
    } finally {
      setIsBuildingContext(false);
    }
  };

  /*
  =========================================================
  NVIDIA NEMOTRON
  =========================================================
  */

  const sendToOrbito = async (mode = "normal") => {
    const messageToSend =
      mode === "alternative"
        ? originalMessage
        : message;

    if (!messageToSend.trim()) {
      setOrbitoError(
        "Tell Orbito what changed first.",
      );
      return;
    }

    setIsLoading(true);
    setOrbitoError("");

    if (mode === "normal") {
      setOrbitoResult(null);
      setOriginalMessage(message);
    }

    try {
      const response = await fetch(
        "http://localhost:3001/api/orbito",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            message: messageToSend,

            profile: {
              name: "Hazel",
            },

            schedule,
            goals,
            preferences,
            mode,

            previousRecommendation:
              mode === "alternative"
                ? orbitoResult
                : null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Orbito could not process that update.",
        );
      }

      setOrbitoResult(data.orbito);
    } catch (error) {
      setOrbitoError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /*
  =========================================================
  APPLY ORBITO'S VALIDATED MOVE
  =========================================================
  */

  const recalibrateOrbit = () => {
    const move = orbitoResult?.moveTask;

    if (
      !move?.task ||
      !move?.fromDay ||
      !move?.fromTime ||
      !move?.toDay ||
      !move?.toTime
    ) {
      return;
    }

    const updatedSchedule = {};

    Object.entries(schedule).forEach(
      ([day, items]) => {
        updatedSchedule[day] = [...items];
      },
    );

    const sourceItems =
      updatedSchedule[move.fromDay] || [];

    const taskIndex = sourceItems.findIndex(
      (item) =>
        item.title.toLowerCase() ===
          move.task.toLowerCase() &&
        item.time === move.fromTime,
    );

    if (taskIndex === -1) {
      setOrbitoError(
        "Orbit could not find that task in the expected schedule slot.",
      );
      return;
    }

    const taskToMove =
      sourceItems[taskIndex];

    updatedSchedule[move.fromDay] =
      sourceItems.filter(
        (_, index) => index !== taskIndex,
      );

    const targetItems =
      updatedSchedule[move.toDay] || [];

    const openSlotIndex =
      targetItems.findIndex(
        (item) =>
          item.title.toLowerCase() ===
            "open time" &&
          item.time === move.toTime,
      );

    if (openSlotIndex === -1) {
      setOrbitoError(
        "Orbit could not find the open time Orbito selected.",
      );
      return;
    }

    updatedSchedule[move.toDay] =
      targetItems.filter(
        (_, index) =>
          index !== openSlotIndex,
      );

    updatedSchedule[move.toDay].push({
      ...taskToMove,
      time: move.toTime,
      type: "Recalibrated by Orbito",
      className: "recalibrated-event",
    });

    setSchedule(updatedSchedule);
    setRecalibrated(true);

    setActivePage("schedule");
    setScheduleView("week");
  };

  const startFreshUpdate = () => {
    setMessage("");
    setOriginalMessage("");
    setOrbitoResult(null);
    setOrbitoError("");
  };

  const todayItems =
    schedule.Sunday || [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <span className="orbit-dot" />
          </div>

          <span>Orbit</span>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-item ${
              activePage === "home"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("home")
            }
          >
            Home
          </button>

          <button
            className={`nav-item ${
              activePage === "schedule"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("schedule")
            }
          >
            Schedule
          </button>

          <button
            className={`nav-item ${
              activePage === "goals"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("goals")
            }
          >
            Goals
          </button>

          <button
            className={`nav-item orbito-nav ${
              activePage === "orbito"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("orbito")
            }
          >
            ✦ Orbito
          </button>

          <button
            className="nav-item"
            onClick={resetDemo}
          >
            ↻ Reset Demo
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {activePage === "home" && (
          <>
            <section className="welcome-section">
              <p className="eyebrow">
                YOUR ORBIT
              </p>

              <h1>Hi, Hazel ✦</h1>

              <p className="welcome-copy">
                Here&apos;s what your day looks
                like. Anything changed?
              </p>

              <div className="quick-actions">
                <button
                  className="primary-button"
                  onClick={() =>
                    setActivePage("orbito")
                  }
                >
                  Tell Orbito
                </button>

                <button
                  className="secondary-button"
                  onClick={() =>
                    setActivePage("goals")
                  }
                >
                  Update my goals
                </button>
              </div>
            </section>

            <section className="dashboard-grid">
              <div className="card today-card">
                <div className="card-header">
                  <div>
                    <p className="card-label">
                      TODAY
                    </p>

                    <h2>Your plan</h2>
                  </div>

                  <span className="date-pill">
                    Sunday
                  </span>
                </div>

                <div className="schedule-list">
                  {todayItems.map((item) => (
                    <div
                      className="schedule-item"
                      key={`${item.time}-${item.title}`}
                    >
                      <div
                        className={`schedule-marker ${
                          item.className ===
                          "blue-event"
                            ? "blue"
                            : item.className ===
                                "pink-event"
                              ? "pink"
                              : item.className ===
                                  "recalibrated-event"
                                ? "recalibrated-marker"
                                : "lavender"
                        }`}
                      />

                      <div className="time">
                        {item.time}
                      </div>

                      <div>
                        <h3>
                          {item.title}
                        </h3>

                        <p>
                          {item.type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="schedule-link"
                  onClick={() =>
                    setActivePage("schedule")
                  }
                >
                  Open full schedule →
                </button>
              </div>

              <div className="side-stack">
                <div className="card insight-card">
                  <p className="card-label">
                    ORBIT INSIGHT
                  </p>

                  <h2>
                    Your goals shape what Orbit
                    protects.
                  </h2>

                  <p>
                    Orbito uses your priorities and
                    preferences when deciding what
                    should move.
                  </p>

                  <button
                    className="text-button"
                    onClick={() =>
                      setActivePage("goals")
                    }
                  >
                    See your goals →
                  </button>
                </div>

                <div className="card space-card">
                  <p className="card-label">
                    ROOM TO BREATHE
                  </p>

                  <h2>
                    You have open time tomorrow.
                  </h2>

                  <p>
                    Orbit can keep that time free or
                    use it when life changes.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {activePage === "schedule" && (
          <section className="schedule-page">
            <div className="page-heading-row">
              <div>
                <p className="eyebrow">
                  YOUR SCHEDULE
                </p>

                <h1>
                  Your time, your Orbit.
                </h1>

                <p className="page-description">
                  What&apos;s fixed, what can move,
                  and where you still have room to
                  breathe.
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={() =>
                  setActivePage("orbito")
                }
              >
                ✦ Life happened
              </button>
            </div>

            {recalibrated && (
              <div className="recalibration-banner">
                <strong>
                  ✦ Orbit recalibrated
                </strong>

                <p>
                  Your schedule changed based on
                  what actually happened.
                </p>
              </div>
            )}

            <div className="schedule-toolbar">
              <div className="view-tabs">
                {[
                  "day",
                  "week",
                  "month",
                  "year",
                ].map((view) => (
                  <button
                    key={view}
                    className={`view-tab ${
                      scheduleView === view
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setScheduleView(view)
                    }
                  >
                    {view
                      .charAt(0)
                      .toUpperCase() +
                      view.slice(1)}
                  </button>
                ))}
              </div>

              <button
                className="try-again-button"
                onClick={() =>
                  setActivePage("orbito")
                }
              >
                Want a different plan? Ask Orbito
              </button>
            </div>

            {scheduleView === "day" && (
              <div className="schedule-panel">
                <div className="schedule-panel-header">
                  <div>
                    <p className="card-label">
                      TODAY
                    </p>

                    <h2>
                      Sunday, September 6
                    </h2>
                  </div>
                </div>

                <div className="timeline">
                  {todayItems.map((item) => (
                    <div
                      className="timeline-row"
                      key={`${item.time}-${item.title}`}
                    >
                      <span>{item.time}</span>

                      <div
                        className={`timeline-event ${item.className}`}
                      >
                        <strong>
                          {item.title}
                        </strong>

                        <small>
                          {item.type}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scheduleView === "week" && (
              <div className="week-grid">
                {Object.entries(schedule).map(
                  ([day, items]) => (
                    <div
                      className="week-day"
                      key={day}
                    >
                      <div className="week-day-header">
                        <span>
                          {day.slice(0, 3)}
                        </span>

                        <strong>
                          {
                            {
                              Sunday: "6",
                              Monday: "7",
                              Tuesday: "8",
                              Wednesday: "9",
                              Thursday: "10",
                              Friday: "11",
                              Saturday: "12",
                            }[day]
                          }
                        </strong>
                      </div>

                      <div className="week-events">
                        {items.length === 0 && (
                          <div className="week-event soft-event">
                            Open time
                          </div>
                        )}

                        {items.map((item) => (
                          <div
                            key={`${item.time}-${item.title}`}
                            className={`week-event ${item.className}`}
                          >
                            <span className="week-event-time">
                              {item.time}
                            </span>

                            <strong>
                              {item.title}
                            </strong>

                            {item.className ===
                              "recalibrated-event" && (
                              <small>
                                ✦ Moved by Orbito
                              </small>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {scheduleView === "month" && (
              <div className="coming-view">
                <p className="card-label">
                  MONTH VIEW
                </p>

                <h2>September 2026</h2>

                <p>
                  Month view helps surface
                  deadlines, recurring goals,
                  busier periods, and open space.
                </p>
              </div>
            )}

            {scheduleView === "year" && (
              <div className="coming-view">
                <p className="card-label">
                  YEAR VIEW
                </p>

                <h2>
                  Your bigger picture
                </h2>

                <p>
                  Connect your schedule with
                  longer-term goals and changing
                  priorities.
                </p>
              </div>
            )}
          </section>
        )}

        {activePage === "goals" && (
          <section className="goals-page">
            <p className="eyebrow">
              BUILD YOUR ORBIT
            </p>

            <h1>
              What are you working toward?
            </h1>

            <p className="page-description">
              Tell Orbit naturally. Google Gemini
              turns your goals and preferences into
              planning context Orbito can actually
              use.
            </p>

            <div className="orbito-chat-card">
              <div className="orbito-example">
                <span>
                  You can say things like:
                </span>

                <p>
                  “I want to work out three times a
                  week, finish my project Thursday,
                  post more consistently, and I have
                  more energy later in the day.”
                </p>
              </div>

              <div className="orbito-input-shell">
                <input
                  type="text"
                  value={goalInput}
                  onChange={(event) =>
                    setGoalInput(
                      event.target.value,
                    )
                  }
                  placeholder="Tell Orbit about your goals and how you work..."
                  disabled={
                    isBuildingContext
                  }
                />

                <button
                  onClick={buildOrbitContext}
                  disabled={
                    isBuildingContext
                  }
                >
                  {isBuildingContext
                    ? "Building..."
                    : "Build my Orbit ✦"}
                </button>
              </div>

              {goalError && (
                <div className="orbito-error">
                  {goalError}
                </div>
              )}

              {isBuildingContext && (
                <div className="orbito-loading">
                  <div className="thinking-dot" />

                  <div>
                    <strong>
                      Understanding what matters...
                    </strong>

                    <p>
                      Google Gemini is turning your
                      goals and preferences into
                      planning context.
                    </p>
                  </div>
                </div>
              )}

              {goalSummary &&
                !isBuildingContext && (
                  <div className="orbito-result">
                    <p className="card-label">
                      GEMINI UNDERSTOOD
                    </p>

                    <h2>{goalSummary}</h2>

                    {preferences.length > 0 && (
                      <div className="recommendation-card">
                        <span>
                          ✦ YOUR RHYTHM
                        </span>

                        {preferences.map(
                          (preference) => (
                            <p
                              key={preference}
                            >
                              {preference}
                            </p>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                )}
            </div>

            <div className="goals-grid">
              {goals.map((goal) => (
                <div
                  className="goal-card"
                  key={goal.id}
                >
                  <span className="goal-icon">
                    {goal.category
                      ?.toLowerCase()
                      .includes("health")
                      ? "♡"
                      : goal.category
                            ?.toLowerCase()
                            .includes("career")
                        ? "✦"
                        : "◌"}
                  </span>

                  <p className="card-label">
                    {(
                      goal.timeframe ||
                      "ONGOING"
                    ).toUpperCase()}
                  </p>

                  <h2>
                    {goal.name}
                  </h2>

                  <p>
                    {goal.category} ·{" "}
                    {goal.priority} priority
                  </p>

                  {goal.deadline && (
                    <p>
                      Deadline:{" "}
                      {goal.deadline}
                    </p>
                  )}

                  {goal.details && (
                    <p>{goal.details}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === "orbito" && (
          <section className="orbito-page">
            <div className="orbito-hero">
              <div className="orbito-orb">
                ✦
              </div>

              <p className="eyebrow">
                ORBITO
              </p>

              <h1>What changed?</h1>

              <p>
                Tell me what actually happened.
                I&apos;ll use your schedule, goals,
                and planning preferences before
                suggesting what should move.
              </p>
            </div>

            <div className="orbito-chat-card">
              <div className="orbito-example">
                <span>Try saying:</span>

                <p>
                  “I went to the gym, but I
                  didn&apos;t finish editing my
                  reel and I&apos;m exhausted
                  tonight.”
                </p>
              </div>

              <div className="orbito-input-shell">
                <input
                  type="text"
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !isLoading
                    ) {
                      sendToOrbito(
                        "normal",
                      );
                    }
                  }}
                  placeholder="Tell Orbito what happened..."
                  disabled={isLoading}
                />

                <button
                  onClick={() =>
                    sendToOrbito("normal")
                  }
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Thinking..."
                    : "Send"}
                </button>
              </div>

              {orbitoError && (
                <div className="orbito-error">
                  {orbitoError}
                </div>
              )}

              {isLoading && (
                <div className="orbito-loading">
                  <div className="thinking-dot" />

                  <div>
                    <strong>
                      Recalibrating your Orbit...
                    </strong>

                    <p>
                      NVIDIA Nemotron is looking at
                      what changed, your schedule,
                      goals, and preferences.
                    </p>
                  </div>
                </div>
              )}

              {orbitoResult &&
                !isLoading && (
                  <div className="orbito-result">
                    <div className="result-top">
                      <div>
                        <p className="card-label">
                          ORBITO UNDERSTOOD
                        </p>

                        <h2>
                          {
                            orbitoResult.summary
                          }
                        </h2>
                      </div>

                      <span
                        className={`energy-pill ${orbitoResult.energy}`}
                      >
                        {orbitoResult.energy}{" "}
                        energy
                      </span>
                    </div>

                    <div className="result-grid">
                      <div className="result-mini-card">
                        <span>
                          ✓ Completed
                        </span>

                        <strong>
                          {orbitoResult
                            .completed
                            ?.length
                            ? orbitoResult.completed.join(
                                ", ",
                              )
                            : "Nothing mentioned"}
                        </strong>
                      </div>

                      <div className="result-mini-card">
                        <span>
                          ↻ Needs attention
                        </span>

                        <strong>
                          {orbitoResult
                            .unfinished
                            ?.length
                            ? orbitoResult.unfinished.join(
                                ", ",
                              )
                            : "Nothing mentioned"}
                        </strong>
                      </div>
                    </div>

                    <div className="recommendation-card">
                      <span>
                        ✦ SUGGESTED ADJUSTMENT
                      </span>

                      <h3>
                        {
                          orbitoResult.recommendation
                        }
                      </h3>

                      <p>
                        {
                          orbitoResult.reason
                        }
                      </p>
                    </div>

                    {orbitoResult.moveTask
                      ?.task && (
                      <div className="move-preview">
                        <div>
                          <span>MOVE</span>

                          <strong>
                            {
                              orbitoResult
                                .moveTask
                                .task
                            }
                            <br />
                            {
                              orbitoResult
                                .moveTask
                                .fromDay
                            }{" "}
                            {
                              orbitoResult
                                .moveTask
                                .fromTime
                            }
                          </strong>
                        </div>

                        <div className="move-arrow">
                          →
                        </div>

                        <div>
                          <span>
                            NEW SLOT
                          </span>

                          <strong>
                            {
                              orbitoResult
                                .moveTask
                                .toDay
                            }{" "}
                            {
                              orbitoResult
                                .moveTask
                                .toTime
                            }
                          </strong>
                        </div>
                      </div>
                    )}

                    <div className="result-actions">
                      {orbitoResult.moveTask
                        ?.task && (
                        <button
                          className="primary-button"
                          onClick={
                            recalibrateOrbit
                          }
                        >
                          Recalibrate my Orbit
                        </button>
                      )}

                      <button
                        className="secondary-button"
                        onClick={() =>
                          sendToOrbito(
                            "alternative",
                          )
                        }
                        disabled={isLoading}
                      >
                        Try another plan
                      </button>

                      <button
                        className="secondary-button"
                        onClick={
                          startFreshUpdate
                        }
                      >
                        Tell Orbito something new
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;