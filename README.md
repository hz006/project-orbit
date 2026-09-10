# Project Orbit ✦

> Your schedule should orbit around your life — not your life around your schedule.

**Project Orbit** is an adaptive planning prototype that helps people reorganize their schedules when real life does not go according to plan.

Instead of treating a schedule as fixed, Orbit combines a person's goals, preferences, existing commitments, and real-time life updates to recommend grounded schedule adjustments.

---

## The problem

Most planning tools are good at helping people create schedules.

They are much worse at helping when those schedules stop being realistic.

A student might plan to:

- finish a project,
- go to the gym,
- edit a creator reel,
- complete applications,
- and still leave time to rest.

But then life changes.

They get tired.
A task takes longer than expected.
Something gets skipped.
Their priorities shift.

Traditional calendars still show the original plan.

Orbit asks a different question:

**What should change now?**

---

## How Orbit works

Orbit uses two AI layers for two different kinds of reasoning.

### 1. Google Gemini — Understand the person's goals

Users can describe what they are working toward in natural language.

For example:

> "I want to finish Project Orbit by Thursday, go to the gym around three times a week, post more consistently, and I usually have more energy later in the day."

Google Gemini converts that into structured planning context such as:

- goals
- categories
- priorities
- deadlines
- timeframes
- planning preferences

This gives Orbit a better understanding of what matters before making scheduling decisions.

---

### 2. NVIDIA Nemotron — Understand what changed

Later, the user can tell Orbito what actually happened.

For example:

> "I went to the gym, but I didn't finish editing my reel and I'm exhausted tonight."

NVIDIA Nemotron interprets that update and identifies:

- completed tasks
- unfinished tasks
- current energy level
- what type of schedule adjustment may make sense

Orbit then validates Nemotron's output against the actual schedule.

The application does not allow the model to invent arbitrary schedule slots.

A move is accepted only when:

- the task actually exists,
- the original day and time match,
- the task is movable,
- and the destination is a real available block.

This combines AI reasoning with deterministic schedule constraints.

---

## Example

### Original schedule

**Sunday**
- 3:30 PM — Gym
- 7:00 PM — Edit creator reel

**Monday**
- 2:00 PM — Open time

### Life update

> "I went to the gym, but I didn't finish editing my reel and I'm exhausted tonight."

### Orbit understands

- Gym → completed
- Edit creator reel → unfinished
- Energy → low

### Orbit recommends

Move:

**Sunday 7:00 PM — Edit creator reel**

to:

**Monday 2:00 PM — Open time**

The user remains in control and chooses whether to apply the change.

---

## Architecture

```text
Natural-language goals and preferences
                │
                ▼
        Google Gemini
   Interactions API
                │
                ▼
Structured planning context
 goals • priorities • preferences
                │
                ▼
          Project Orbit
                │
        Existing schedule
                │
                ▼
        Real-life update
                │
                ▼
      NVIDIA Nemotron
                │
                ▼
 AI scheduling recommendation
                │
                ▼
 Orbit constraint validation
 task exists • slot exists • move valid
                │
                ▼
     User-approved recalibration
                │
                ▼
       Updated schedule
Technology
Frontend
React
Vite
JavaScript
CSS
Backend
Node.js
Express
Google
Google Gemini
Gemini Interactions API
gemini-flash-lite-latest

Gemini is used as Orbit's natural-language goal and preference understanding layer.

NVIDIA
NVIDIA Nemotron
NVIDIA hosted inference API
nvidia/nemotron-3.5-lightning-30b-a3b

Nemotron is used as Orbito's life-update and schedule-recalibration reasoning layer.

Grounded AI design

Orbit intentionally does not let the language model directly rewrite the schedule without validation.

The backend checks model recommendations against trusted application state.

For task status changes, Orbit verifies:

the task exists in the current schedule,
the model provides evidence,
that evidence appears in the user's actual message.

For schedule moves, Orbit verifies:

the source task exists,
the source day and time are correct,
the destination is an actual open block,
fixed commitments are protected.

This helps reduce hallucinated schedule changes.

Alternate-plan behavior

Orbit also supports Try another plan.

If the user does not like the first recommended time, Orbito can generate another recommendation.

The previous destination is removed from the allowed set before the next model request, helping prevent the model from simply repeating the same plan.

Product philosophy

Orbit is based on a simple idea:

Productivity tools should adapt to people instead of forcing people to continuously adapt to their tools.

Rest, health, creative work, school, career goals, and personal priorities all compete for limited time.

Orbit is designed to help people make those tradeoffs more consciously while keeping the user in control.

Demo flow
Open Goals
Describe goals and planning preferences naturally
Click Build my Orbit
Google Gemini creates structured planning context
Open Orbito
Explain what changed
NVIDIA Nemotron interprets the update
Orbit validates a schedule adjustment
Click Recalibrate my Orbit
See the schedule visibly update
Project status

Project Orbit is currently a working prototype built for the Google Cloud × NVIDIA Golden Ticket challenge.

Future directions could include:

calendar integrations
persistent user accounts
automatically generated schedules
recurring routines
multi-day planning
notifications
long-term goal tracking
richer preference learning
mobile experiences
Built by

Hazel
University of Washington
Informatics