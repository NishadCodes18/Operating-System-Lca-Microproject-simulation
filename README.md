# Railway Deadlock Simulation: Transportation & Rail Systems

**Created by:** Nishad Patil
**Class:** Int. B.Tech, TY CSE B
**Roll No.:** 41
**PRN No.:** 1262241550
**Subject:** Operating System (LCA)
**Industrial application:** Transportation & Rail Systems

---

## 1. About the Project

This project shows how a **deadlock** happens in an Operating System, using a **single-track railway with block signalling** as the real-world example.

The track is split into two **signal blocks**. A block can hold only one train at a time, exactly like a resource that only one process can use at a time.

| OS term | Railway meaning |
|---------|-----------------|
| P1 | Express 101, a passenger train travelling east |
| P2 | Freight 202, a goods train travelling west |
| R1 | Track Block A (west section) |
| R2 | Track Block B (east section) |

Both trains must pass through **both** blocks to reach their destination.

## 2. How to Run

1. Keep these files in the **same folder** (use a different folder from the factory version):
   - `index.html`
   - `style.css`
   - `script.js`
2. Double-click `index.html` to open it in **Google Chrome**.

No installation, server, internet, database, API or framework is needed. It works completely offline.

## 3. Buttons

| Button | What it does |
|--------|--------------|
| **Start** | Starts the simulation, or continues it after a pause |
| **Pause** | Freezes the simulation, including the trains |
| **Reset** | Returns everything to the beginning |
| **Recovery method** (dropdown) | Chooses how the dispatcher fixes the deadlock (see section 5) |
| **Recover** | Becomes active only after deadlock is detected, then applies the chosen method |

## 4. What Happens in the Simulation

1. P1 requests Block A and P2 requests Block B.
2. P1 enters Block A and P2 enters Block B. Their signals turn green.
3. P1 now needs Block B, which P2 holds. P2 now needs Block A, which P1 holds.
4. Both trains stop **nose-to-nose** at red signals and are **BLOCKED**. The system detects a cycle and shows **DEADLOCK DETECTED** (lightning flash, red alarm, flashing signals).
5. Choose a recovery method and press **Recover**. The system recovers, the storm clears and dawn breaks.

The step tracker near the top follows these stages: Request, Enter block, Run, Request next, Deadlock, Recovery.

## 5. Recovery Methods

| Option | What it does | Condition broken |
|--------|--------------|------------------|
| **Auto (dispatcher chooses)** | Terminates the train that has made less progress. If equal, P2 is chosen. | Circular Wait |
| **Terminate P1** | Express 101 is withdrawn from service and releases Block A. Freight 202 gets Block A and finishes. | Circular Wait |
| **Terminate P2** | Freight 202 is withdrawn from service and releases Block B. Express 101 gets Block B and finishes. | Circular Wait |
| **Preempt Block A from P1** | Block A is forcibly taken from Express 101. The train reverses to the depot (rolled back) and Freight 202 passes. Then Express 101 restarts and also finishes. | No Preemption |
| **Preempt Block B from P2** | Block B is forcibly taken from Freight 202. The train reverses to the depot (rolled back) and Express 101 passes. Then Freight 202 restarts and also finishes. | No Preemption |

**Terminate:** the train dissolves from the line (process killed, resources freed).
**Preempt:** the train reverses to its depot, is moved sideways onto a siding by a **transfer table**, waits, then restarts (process rolled back and restarted).

## 6. The Four Deadlock Conditions

All four must be true at the same time for a deadlock. The dashboard lights each one up when it becomes true.

1. **Mutual Exclusion:** a track block can hold only one train at a time.
2. **Hold and Wait:** a train keeps its current block while waiting for the next one.
3. **No Preemption:** a block cannot be forcibly taken from a train.
4. **Circular Wait:** P1 waits for P2 and P2 waits for P1 (P1 → R2 → P2 → R1 → P1).

## 7. Dashboard Guide

- **Railway Line:** animated night scene.
  - Orange glow under the track = block occupied. Green = free. Red = deadlock.
  - Signals: green = train may proceed, amber = request pending, red = train must stop.
  - Station boards show each train's status (ON TIME, DEPARTED, HELD AT SIGNAL, CANCELLED, ARRIVED).
  - Trains have working wheels, headlights, pantograph sparks and diesel smoke, and reflect in the wet rails.
- **Dispatcher control board:** a real-style track-circuit diagram showing the two blocks, the signals and the train positions.
- **Resource Allocation Graph (RAG):**
  - Circle = process, square = resource.
  - Blue solid arrow (Resource → Process) = allocated.
  - Orange dashed arrow (Process → Resource) = requesting.
  - A closed loop of arrows means deadlock, and the arrows turn red.
- **Four Conditions panel:** shows which conditions are currently true, with a counter out of 4.
- **Event Log:** timestamped list of everything that happens.
- **Recovery Method panel:** explains the selected recovery method.

## 8. How Deadlock Detection Works

The code builds a **wait-for graph**: process A points to process B if A is waiting for a block that B holds. If following these arrows leads back to the starting process, a cycle exists and the system declares a deadlock. This is the `findCycle()` function in `script.js`.

## 9. Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure, railway scene and graph (SVG), panels |
| `style.css` | Dark industrial theme (blue and orange), layout and animations |
| `script.js` | Simulation logic, deadlock detection, recovery methods, train and scene animation |

To change the simulation speed, edit `STEP_DELAY` at the top of `script.js` (default 2000 ms per step).

## 10. Technology

HTML, CSS and JavaScript only. No backend, database, APIs, libraries or frameworks.

## 11. Quick Viva Answers

- **What is deadlock?** A situation where processes wait for each other forever and none can proceed.
- **Why does it happen here?** Express 101 holds Block A and needs Block B, while Freight 202 holds Block B and needs Block A.
- **How is it detected?** By finding a cycle in the wait-for / resource allocation graph.
- **How is it fixed?** Terminate a process (breaks Circular Wait) or preempt a resource (breaks No Preemption).
- **Real-world example?** Trains on a single track with block signalling can lock each other out if they request blocks in opposite orders. Railways avoid this with fixed block ordering, timetables and dispatcher control.
