# meter_ops prompt

Create a web application called `meter_ops` for calculating electricity meter consumption and estimated bills.

## Core workflow

- The home page shows a list of previous meter-reading sessions.
- Each session contains:
  - a session date
  - readings from multiple meters
  - the associated flat number for each reading
- The home page also includes a graph that shows consumption trends across time using immediate session-to-session comparisons.

## Session capture flow

- A floating action button sits at the bottom right of the screen.
- Pressing it opens the device camera to scan a meter reading.
- After capturing the image, OCR extracts text from the image.
- Show a modal containing:
  - the OCR-converted text
  - an editable field for the flat number
  - a `Next` button
  - an `End session` button
- `Next` adds the current reading to the active session and reopens the capture flow for another meter.
- `End session` closes and saves the session.

## Consumption page

- The top bar contains a `Consumption` button that opens a separate page.
- That page shows a list of previous sessions.
- The user can choose any 2 sessions.
- The system calculates:
  - meter consumption between the 2 dates for each flat
  - bill amounts using a configurable per-unit tariff

## UI direction

- High-contrast neon on black
- Glitch animation accents
- Terminal and monospace typography
- Tech-oriented panel decorations and scan-line effects
- Dystopian 80s sci-fi and hacker-culture aesthetic

## Product goals

- Fast session capture on mobile
- Clear OCR review before saving
- Simple historical comparison across sessions
- Strong visual identity without sacrificing readability
