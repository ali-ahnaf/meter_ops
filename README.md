# meter_ops

A neon-black Next.js app for logging electricity meter sessions, reviewing OCR output, and comparing any two sessions to calculate consumption and estimated bills.

## What it does

- Shows archived meter-reading sessions on the home page
- Opens the device camera from a floating action button
- Runs OCR on the captured image and lets the user correct the text
- Groups multiple scanned readings into a single session
- Compares any two sessions on the `Consumption` page
- Visualizes immediate session-to-session consumption drift in a chart

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- `tesseract.js` for browser OCR
- `localStorage` for lightweight persistence

## Quick start

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Notes

- Sessions are stored locally in the browser.
- OCR is editable before a reading is committed, because OCR confidence is not a personality trait.
- The source product prompt lives in [PROJECT_PROMPT.md](/home/valhalla/Projects/meter_ops/PROJECT_PROMPT.md).
