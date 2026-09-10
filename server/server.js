import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Orbit backend is running.",
    technologies: {
      context: "Google Gemini via Interactions API",
      recalibration: "NVIDIA Nemotron 3.5 Lightning",
    },
  });
});

/*
=========================================================
GOOGLE GEMINI
Natural-language goals/preferences
→ structured Orbit planning context
=========================================================
*/

app.post("/api/orbit-context", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Tell Orbit what you're working toward.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing.",
      });
    }

    console.log("Sending planning context to Google Gemini...");

    const prompt = `
You are the goal-and-preference understanding layer inside an adaptive
planning app called Orbit.

Orbit's philosophy:
"Your schedule should orbit around your life, not your life around your schedule."

Someone is telling Orbit about:
- goals
- deadlines
- habits
- priorities
- energy patterns
- routines
- things they want more time for

They said:

"${message}"

Turn this into structured planning context.

RULES:

1. Do not invent deadlines.
2. Do not invent schedules.
3. Do not invent goals that were not mentioned or clearly implied.
4. If there is no deadline, use an empty string.
5. Keep goal names concise.
6. Treat health, rest, fun, creative work, school, and career as legitimate.
7. Use priority "high" when something has a clear near-term deadline or strong urgency.
8. Otherwise use "medium" unless the message clearly indicates low priority.
9. Capture useful planning preferences such as:
   - more energy later in the day
   - prefers mornings
   - prefers evenings
   - needs recovery time
   - likes long focus blocks
   - prefers shorter sessions
   - wants free time protected
10. Do not add preferences unsupported by the message.

Return ONLY valid JSON in exactly this structure:

{
  "summary": "brief natural summary using you/your language",
  "goals": [
    {
      "name": "goal name",
      "category": "category",
      "priority": "high",
      "timeframe": "this week",
      "deadline": "",
      "details": "brief useful detail"
    }
  ],
  "preferences": [
    "planning preference"
  ]
}

priority must be one of:
"low"
"medium"
"high"
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",

        headers: {
          "x-goog-api-key": process.env.GEMINI_API_KEY,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: "gemini-flash-lite-latest",
          input: prompt,
        }),
      },
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Gemini API error:", responseText);

      return res.status(response.status).json({
        error: "Google Gemini API request failed.",
        details: responseText,
      });
    }

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({
        error: "Could not parse Google Gemini response.",
      });
    }

    const outputStep = data?.steps?.find(
      (step) => step.type === "model_output",
    );

    const modelText = outputStep?.content
      ?.map((item) => item.text || "")
      .join("")
      .trim();

    if (!modelText) {
      return res.status(502).json({
        error: "Gemini returned no usable planning context.",
      });
    }

    const cleaned = modelText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    let context;

    try {
      context = JSON.parse(cleaned);
    } catch {
      console.error("Gemini raw output:", modelText);

      return res.status(502).json({
        error: "Gemini did not return valid structured JSON.",
      });
    }

    context.goals = Array.isArray(context.goals)
      ? context.goals
      : [];

    context.preferences = Array.isArray(context.preferences)
      ? context.preferences
      : [];

    context.goals = context.goals.map((goal, index) => ({
      id: `gemini-${Date.now()}-${index}`,
      name: goal.name || "Untitled goal",
      category: goal.category || "Personal",
      priority: ["low", "medium", "high"].includes(goal.priority)
        ? goal.priority
        : "medium",
      timeframe: goal.timeframe || "Ongoing",
      deadline: goal.deadline || "",
      details: goal.details || "",
      source: "Gemini",
    }));

    console.log("Google Gemini planning context created.");

    return res.json({
      success: true,
      provider: "Google",
      model: "gemini-flash-lite-latest",
      context,
    });
  } catch (error) {
    console.error("Gemini route error:", error);

    return res.status(500).json({
      error: "Orbit could not create planning context.",
      details: error.message,
    });
  }
});

/*
=========================================================
NVIDIA NEMOTRON
Actual life update + Orbit context
→ grounded schedule recalibration
=========================================================
*/

app.post("/api/orbito", async (req, res) => {
  try {
    const {
      message,
      schedule,
      goals,
      preferences,
      profile,
      previousRecommendation,
      mode = "normal",
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Please tell Orbito what changed.",
      });
    }

    if (!process.env.NVIDIA_API_KEY) {
      return res.status(500).json({
        error: "NVIDIA_API_KEY is missing.",
      });
    }

    if (!schedule || typeof schedule !== "object") {
      return res.status(400).json({
        error: "Orbit did not send a valid schedule.",
      });
    }

    /*
    =========================================================
    TRUSTED SCHEDULE STATE
    =========================================================
    */

    const scheduleTasks = [];
    const openSlots = [];

    Object.entries(schedule).forEach(([day, items]) => {
      items.forEach((item) => {
        const scheduleItem = {
          day,
          time: item.time,
          title: item.title,
          flexibility: item.flexibility,
        };

        scheduleTasks.push(scheduleItem);

        if (item.title.toLowerCase() === "open time") {
          openSlots.push({
            day,
            time: item.time,
          });
        }
      });
    });

    /*
    =========================================================
    ALTERNATIVE PLAN DESTINATIONS
    =========================================================
    */

    let availableOpenSlots = [...openSlots];

    if (
      mode === "alternative" &&
      previousRecommendation?.moveTask?.toDay &&
      previousRecommendation?.moveTask?.toTime
    ) {
      availableOpenSlots = openSlots.filter(
        (slot) =>
          !(
            slot.day === previousRecommendation.moveTask.toDay &&
            slot.time === previousRecommendation.moveTask.toTime
          ),
      );
    }

    /*
    =========================================================
    SYSTEM CONTEXT

    Important change:
    Schedule/goals/preferences are BACKGROUND CONTEXT.
    They are no longer mixed into the user's life-update message.
    =========================================================
    */

    const systemPrompt = `
You are Orbito, the adaptive scheduling assistant inside Orbit.

Orbit philosophy:
"Your schedule should orbit around your life, not your life around your schedule."

Your job is to respond ONLY to what the person says in their CURRENT UPDATE.

The schedule, goals, and preferences below are BACKGROUND CONTEXT.
They help you make a scheduling decision.

They are NOT things that just happened.

Do NOT treat a goal as:
- completed
- missed
- newly mentioned
- a current event

unless the CURRENT UPDATE explicitly says that.

==================================================
NAME
==================================================

${profile?.name || ""}

Speak directly using "you" and "your".
Never call them "the user" or "the person".

==================================================
BACKGROUND: CURRENT SCHEDULE
==================================================

${JSON.stringify(schedule, null, 2)}

==================================================
BACKGROUND: GOALS
==================================================

${JSON.stringify(goals || [], null, 2)}

==================================================
BACKGROUND: PLANNING PREFERENCES
==================================================

${JSON.stringify(preferences || [], null, 2)}

==================================================
REQUEST MODE
==================================================

${mode}

==================================================
PREVIOUS RECOMMENDATION
==================================================

${
  previousRecommendation
    ? JSON.stringify(previousRecommendation, null, 2)
    : "None"
}

==================================================
ALLOWED OPEN DESTINATIONS
==================================================

${JSON.stringify(availableOpenSlots, null, 2)}

These are the ONLY available destination slots.

==================================================
CRITICAL CURRENT-UPDATE RULE
==================================================

The next USER message contains the ONLY thing that just happened.

Your summary must summarize THAT USER MESSAGE.

Do not summarize the goals.

Do not summarize the background schedule.

Do not claim a goal was just mentioned simply because it exists above.

==================================================
STATUS RULES
==================================================

A task is completed ONLY if the CURRENT UPDATE explicitly says it happened.

Example:

CURRENT UPDATE:
"I went to the gym."

Then:
Gym = completed

A task is unfinished ONLY if the CURRENT UPDATE explicitly says it was
not finished, missed, skipped, or could not be done.

Example:

CURRENT UPDATE:
"I didn't finish editing my reel."

Then:
Edit creator reel = unfinished

For every status change:
- use the exact title from CURRENT SCHEDULE
- use "completed" or "unfinished"
- copy exact supporting evidence from the CURRENT UPDATE

Do not infer unrelated statuses.

==================================================
SCHEDULING RULES
==================================================

1. Never invent a task.

2. Never invent completed or unfinished status.

3. Never invent a task's original day or time.

4. If moving a task:
   fromDay and fromTime must EXACTLY match CURRENT SCHEDULE.

5. The destination must be one of ALLOWED OPEN DESTINATIONS.

6. Never invent availability.

7. Protect fixed commitments and hard deadlines.

8. Goals help determine importance, but goals are NOT current events.

9. Preferences help choose between valid destinations.

10. Respect exhaustion, illness, low energy, unexpected events, and recovery.

11. Rest is legitimate.

12. Do not fill every open minute.

13. Recommend at most ONE move.

14. If REQUEST MODE is "alternative":
    - do not repeat the previous destination
    - choose another allowed destination
    - if no good alternative exists, use null move fields

==================================================
OUTPUT
==================================================

Return ONLY valid JSON:

{
  "summary": "summary ONLY of the current update, using you/your",
  "statusChanges": [
    {
      "task": "exact scheduled task title",
      "status": "completed",
      "evidence": "exact words copied from CURRENT UPDATE"
    }
  ],
  "energy": "unknown",
  "recommendation": "short recommendation based on the current update",
  "moveTask": {
    "task": null,
    "fromDay": null,
    "fromTime": null,
    "toDay": null,
    "toTime": null
  },
  "reason": "brief explanation"
}

energy must be exactly:
"low"
"medium"
"high"
"unknown"

Return JSON only.
`;

    /*
    =========================================================
    NVIDIA CALL

    System = Orbit context
    User = ONLY what just happened
    =========================================================
    */

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 45000);

    let response;

    try {
      response = await fetch(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify({
            model: "nvidia/nemotron-3.5-lightning-30b-a3b",

            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: `CURRENT UPDATE:\n${message}`,
              },
            ],

            response_format: {
              type: "json_object",
            },

            chat_template_kwargs: {
              enable_thinking: false,
            },

            max_tokens: 700,
            temperature: mode === "alternative" ? 0.25 : 0.05,
            stream: false,
          }),

          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await response.text();

    if (!response.ok) {
      console.error("NVIDIA API error:", responseText);

      return res.status(response.status).json({
        error: "NVIDIA API request failed.",
        details: responseText,
      });
    }

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({
        error: "Could not parse NVIDIA response.",
      });
    }

    const modelText =
      data?.choices?.[0]?.message?.content;

    if (!modelText) {
      return res.status(502).json({
        error: "Nemotron returned no response.",
      });
    }

    let orbito;

    try {
      orbito = JSON.parse(modelText);
    } catch {
      console.error("Nemotron raw output:", modelText);

      return res.status(502).json({
        error: "Nemotron did not return valid JSON.",
      });
    }

    /*
    =========================================================
    VALIDATE STATUS EVIDENCE
    =========================================================
    */

    const normalizedMessage =
      message.toLowerCase();

    const rawChanges = Array.isArray(orbito.statusChanges)
      ? orbito.statusChanges
      : [];

    const validatedChanges = [];

    rawChanges.forEach((change) => {
      if (
        !change?.task ||
        !change?.status ||
        !change?.evidence
      ) {
        return;
      }

      const actualTask = scheduleTasks.find(
        (task) =>
          task.title.toLowerCase() ===
          change.task.toLowerCase(),
      );

      if (!actualTask) {
        return;
      }

      if (
        change.status !== "completed" &&
        change.status !== "unfinished"
      ) {
        return;
      }

      const evidence =
        change.evidence.trim().toLowerCase();

      if (
        !evidence ||
        !normalizedMessage.includes(evidence)
      ) {
        return;
      }

      validatedChanges.push({
        task: actualTask.title,
        status: change.status,
        evidence: change.evidence,
      });
    });

    orbito.statusChanges = validatedChanges;

    orbito.completed = [
      ...new Set(
        validatedChanges
          .filter((change) => change.status === "completed")
          .map((change) => change.task),
      ),
    ];

    orbito.unfinished = [
      ...new Set(
        validatedChanges
          .filter((change) => change.status === "unfinished")
          .map((change) => change.task),
      ),
    ];

    /*
    =========================================================
    VALIDATE ENERGY
    =========================================================
    */

    const validEnergy = [
      "low",
      "medium",
      "high",
      "unknown",
    ];

    if (!validEnergy.includes(orbito.energy)) {
      orbito.energy = "unknown";
    }

    /*
    =========================================================
    VALIDATE SOURCE TASK
    =========================================================
    */

    if (orbito.moveTask?.task) {
      const sourceExists = scheduleTasks.some(
        (task) =>
          task.title.toLowerCase() ===
            orbito.moveTask.task.toLowerCase() &&
          task.day === orbito.moveTask.fromDay &&
          task.time === orbito.moveTask.fromTime,
      );

      if (!sourceExists) {
        console.log("Rejected invalid source move.");

        orbito.moveTask = {
          task: null,
          fromDay: null,
          fromTime: null,
          toDay: null,
          toTime: null,
        };

        orbito.recommendation =
          "I understand what changed, but I need a little more context before moving anything.";

        orbito.reason =
          "I won't move something unless I'm certain where it currently belongs.";
      }
    }

    /*
    =========================================================
    VALIDATE DESTINATION
    =========================================================
    */

    if (orbito.moveTask?.task) {
      const destinationAllowed =
        availableOpenSlots.some(
          (slot) =>
            slot.day === orbito.moveTask.toDay &&
            slot.time === orbito.moveTask.toTime,
        );

      if (!destinationAllowed) {
        console.log(
          "Rejected unavailable destination:",
          orbito.moveTask.toDay,
          orbito.moveTask.toTime,
        );

        orbito.moveTask = {
          task: null,
          fromDay: null,
          fromTime: null,
          toDay: null,
          toTime: null,
        };

        orbito.recommendation =
          "I need one more preference before suggesting another time.";

        orbito.reason =
          "I don't want to invent free time that isn't actually available.";
      }
    }

    /*
=========================================================
DETERMINISTIC FALLBACK

If Nemotron correctly identifies an unfinished flexible task
but chooses not to move it, Orbit's scheduling layer selects
a real available slot instead of leaving the recommendation vague.
=========================================================
*/

if (
  !orbito.moveTask?.task &&
  orbito.unfinished?.length > 0 &&
  availableOpenSlots.length > 0
) {
  const unfinishedTaskName = orbito.unfinished[0];

  const unfinishedTask = scheduleTasks.find(
    (task) =>
      task.title.toLowerCase() ===
        unfinishedTaskName.toLowerCase() &&
      task.flexibility === "flexible",
  );

  if (unfinishedTask) {
    const destination = availableOpenSlots[0];

    orbito.moveTask = {
      task: unfinishedTask.title,
      fromDay: unfinishedTask.day,
      fromTime: unfinishedTask.time,
      toDay: destination.day,
      toTime: destination.time,
    };

    orbito.recommendation =
      `Give yourself tonight to recover, then move ${unfinishedTask.title} to ${destination.day} at ${destination.time}.`;

    orbito.reason =
      `You're low on energy, and this task is flexible. Moving it to a real open block protects your recovery without dropping the task.`;
  }
}

/*
Make visible Orbito language conversational.
*/

if (typeof orbito.reason === "string") {
  orbito.reason = orbito.reason
    .replace(/^User is\b/i, "You're")
    .replace(/^The user is\b/i, "You're")
    .replace(/\bthe user\b/gi, "you");
}

    console.log("NVIDIA Nemotron recalibration complete.");
    console.log("Current update:", message);
    console.log("Completed:", orbito.completed);
    console.log("Unfinished:", orbito.unfinished);

    return res.json({
      success: true,
      provider: "NVIDIA",
      model: "nvidia/nemotron-3.5-lightning-30b-a3b",
      orbito,
    });
  } catch (error) {
    console.error("Orbit server error:", error);

    if (error.name === "AbortError") {
      return res.status(504).json({
        error: "NVIDIA request timed out.",
      });
    }

    return res.status(500).json({
      error: "Orbit backend encountered an error.",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Orbit backend running at http://localhost:${PORT}`,
  );
});