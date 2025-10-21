# Gradient Descent & Linear Regression Visualizer

A lightweight, front-end-only web app to help students visualize data with a loose linear trend. Built with vanilla HTML/CSS/JS (no frameworks). Charting is done with Chart.js via CDN.

This version renders a simple, light-themed scatter plot of 2D points with a gentle linear trend (no interactive controls). Future steps can add gradient descent animations for fitting a line.

## Quick start

Open `index.html` in a browser, or serve the folder with any static server. For example, using Python on Linux/macOS:

```bash
python3 -m http.server 8000
```

Then visit:

- http://localhost:8000/

## What it shows

- A single scatter plot of synthetic (x, y) points.
- Data follows a linear relationship with Gaussian noise.

## Tech notes

- Front-end only (no build, no bundler).
- Charting with Chart.js loaded from CDN.
- All files live at the repository root: `index.html`, `styles.css`, `script.js`.

## Next steps (ideas)

- Overlay the true generating line.
- Add a candidate line (parameters w, b) and a cost (MSE) display.
- Animate gradient descent steps updating the candidate line.
- Add a loss landscape panel (J(w, b)).