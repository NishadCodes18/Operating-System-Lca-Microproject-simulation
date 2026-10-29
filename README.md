# Deadlock Simulation: Automated Factory Resource Management

**Created by:** Nishad Patil
**Class:** Int. B.Tech, TY CSE B
**Roll No.:** 41
**PRN No.:** 1262241550
**Subject:** Operating System (LCA)

---

## 1. About the Project

This project shows how a **deadlock** happens in an Operating System, using an automated factory as the real-world example.

Two robots (processes) need two shared tools (resources) to finish their jobs:

| OS term | Factory meaning |
|---------|-----------------|
| P1 | Assembly Robot |
| P2 | Packaging Robot |
| R1 | Welding Tool |
| R2 | Paint Sprayer |

Each tool can be used by only one robot at a time. If the robots grab the tools in the wrong order, both get stuck forever. That is a deadlock.

## 2. How to Run

1. Keep these three files in the **same folder**:
   - `index.html`
   - `style.css`
   - `script.js`
2. Double-click `index.html` to open it in **Google Chrome**.

No installation, server, internet, database, API or framework is needed. It works completely offline.

## 3. Buttons

| Button | What it does |
|--------|--------------|
| **Start** | Starts the simulation, or continues it after a pause |
| **Pause** | Freezes the simulation |
| **Reset** | Returns everything to the beginning |
| **Recovery method** (dropdown) | Chooses how to fix the deadlock (see section 5) |
| **Recover** | Becomes active only after deadlock is detected, then applies the chosen method |

## 4. What Happens in the Simulation

1. P1 requests R1 and P2 requests R2.
2. P1 acquires R1 and P2 acquires R2. Both start working.
3. P1 now requests R2, which P2 holds. P2 now requests R1, which P1 holds.
4. Both processes are **BLOCKED**. The system detects a cycle and shows **DEADLOCK DETECTED**.
5. Choose a recovery method and press **Recover**. The system recovers and the work completes.

The step tracker near the top follows these stages: Request, Acquire, Work, Cross-request, Deadlock, Recovery.

## 5. Recovery Methods

| Option | What it does | Condition broken |
|--------|--------------|------------------|
| **Auto (system chooses)** | Terminates the process that has done less work. If equal, P2 is chosen. | Circular Wait |
| **Terminate P1** | P1 is killed and releases R1. P2 gets R1 and finishes. | Circular Wait |
| **Terminate P2** | P2 is killed and releases R2. P1 gets R2 and finishes. | Circular Wait |
| **Preempt R1 from P1** | R1 is forcibly taken from P1 (P1 rolls back) and given to P2. P2 finishes, then P1 restarts and finishes. | No Preemption |
| **Preempt R2 from P2** | R2 is forcibly taken from P2 (P2 rolls back) and given to P1. P1 finishes, then P2 restarts and finishes. | No Preemption |

## 6. The Four Deadlock Conditions

All four must be true at the same time for a deadlock. The dashboard lights each one up when it becomes true.

1. **Mutual Exclusion:** only one process can use a resource at a time.
2. **Hold and Wait:** a process holds one resource while waiting for another.
3. **No Preemption:** a resource cannot be forcibly taken from a process.
4. **Circular Wait:** processes wait for each other in a cycle (P1 → R2 → P2 → R1 → P1).

## 7. Dashboard Guide

- **Factory Floor:** animated scene. Blue cables mean a tool is allocated to a robot. A robot arm reaching for a tool means it is requesting it. At deadlock the arms cross and tremble, the cables turn red and the conveyor stops.
- **Resource Allocation Graph (RAG):**
  - Circle = process, square = resource.
  - Blue solid arrow (Resource → Process) = allocated.
  - Orange dashed arrow (Process → Resource) = requesting.
  - A closed loop of arrows means deadlock, and the arrows turn red.
- **Four Conditions panel:** shows which conditions are currently true, with a counter out of 4.
- **Event Log:** timestamped list of everything that happens.
- **Recovery Method panel:** explains the selected recovery method.

## 8. How Deadlock Detection Works

The code builds a **wait-for graph**: process A points to process B if A is waiting for a resource that B holds. If following these arrows leads back to the starting process, a cycle exists and the system declares a deadlock. This is the `findCycle()` function in `script.js`.

## 9. Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure, factory scene and graph (SVG), panels |
| `style.css` | Dark industrial theme (blue and orange), layout and animations |
| `script.js` | Simulation logic, deadlock detection, recovery methods, drawing and animation |

To change the simulation speed, edit `STEP_DELAY` at the top of `script.js` (default 2000 ms per step).

## 10. Technology

HTML, CSS and JavaScript only. No backend, database, APIs, libraries or frameworks.

## 11. Quick Viva Answers

- **What is deadlock?** A situation where processes wait for each other forever and none can proceed.
- **Why does it happen here?** P1 holds R1 and needs R2, while P2 holds R2 and needs R1.
- **How is it detected?** By finding a cycle in the wait-for / resource allocation graph.
- **How is it fixed?** Terminate a process (breaks Circular Wait) or preempt a resource (breaks No Preemption).
