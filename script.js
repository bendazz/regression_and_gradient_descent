// script.js — generate points with a loose linear trend and plot them

function randn() {
  // Box–Muller transform for standard normal
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateData(n = 120, slope = -0.8, intercept = 10, noise = 1.2) {
  // x in [0,10]
  const xs = Array.from({ length: n }, (_, i) => (i / (n - 1)) * 10);
  const data = xs.map(x => {
    const yTrue = slope * x + intercept; // expect decreasing
    let y = yTrue + noise * randn();
    // clamp y to [0,10] for a neat bounded view
    y = Math.max(0, Math.min(10, y));
    return { x, y };
  });
  return data;
}

let chart;

function makeScatter(ctx, points) {
  if (chart) {
    chart.destroy();
  }
  const xs = points.map(p => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = 0;
  const maxY = 10;

  chart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          data: points,
          showLine: false,
          pointRadius: 3,
          backgroundColor: 'rgba(37, 99, 235, 0.9)', // blue-600
          borderColor: 'rgba(37, 99, 235, 1)'
        },
        // Single candidate regression line (animated, red)
        {
          data: [ { x: minX, y: 0 }, { x: maxX, y: 0 } ],
          type: 'line',
          showLine: true,
          pointRadius: 0,
          borderColor: 'rgba(220, 38, 38, 1)',  // red-600
          borderWidth: 2,
          fill: false,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: {
          min: 0,
          max: 10,
          title: { display: true, text: 'x', color: '#111827' },
          grid: { color: 'rgba(17, 24, 39, 0.08)' },
          ticks: { color: '#111827' }
        },
        y: {
          min: minY,
          max: maxY,
          title: { display: true, text: 'y', color: '#111827' },
          grid: { color: 'rgba(17, 24, 39, 0.08)' },
          ticks: { color: '#111827' }
        }
      }
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('scatter');
  const ctx = canvas.getContext('2d');
  let points = generateData();
  makeScatter(ctx, points);

  // After scatter is rendered, compute MSE grid and render contour
  const contourEl = document.getElementById('mse-contour');
  if (contourEl && window.Plotly) {
    renderMseContour(contourEl, points);
  }

  // Gradient descent animation wiring
  const lrInput = document.getElementById('lr');
  const startStopBtn = document.getElementById('startStop');
  const resetBtn = document.getElementById('reset');
  const statusEl = document.getElementById('status');

  // Initialize parameters (candidate line): start at (w,b) = (0, 0)
  let w = 0, b = 0;
  let running = false;
  let rafId = null;

  // Helper to update candidate line on the left chart
  function updateCandidateLine() {
    if (!chart) return;
    const xs = points.map(p => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const y1 = w * minX + b;
    const y2 = w * maxX + b;
    const candidateDs = chart.data.datasets[1]; // second dataset is candidate line
    candidateDs.data = [ { x: minX, y: y1 }, { x: maxX, y: y2 } ];
    chart.update('none');
  }

  // Helper to update the point on the right contour plot
  function updateContourPoint() {
    if (!contourEl || !window.Plotly) return;
    Plotly.restyle(contourEl, { x: [[w]], y: [[b]] }, [1]); // second trace is the point
  }

  function gradW(pts, w, b) {
    const n = pts.length;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const { x, y } = pts[i];
      s += (w * x + b - y) * x;
    }
    return (2 / n) * s;
  }

  function gradB(pts, w, b) {
    const n = pts.length;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const { x, y } = pts[i];
      s += (w * x + b - y);
    }
    return (2 / n) * s;
  }

  function step() {
    const lr = Math.max(0.0001, Math.min(1, parseFloat(lrInput.value) || 0.01));
    const dw = gradW(points, w, b);
    const db = gradB(points, w, b);
    w -= lr * dw;
    b -= lr * db;
    updateCandidateLine();
    updateContourPoint();
  }

  function loop() {
    if (!running) return;
    step();
    rafId = requestAnimationFrame(loop);
  }

  startStopBtn?.addEventListener('click', () => {
    running = !running;
    startStopBtn.textContent = running ? 'Pause' : 'Start';
    statusEl.textContent = running ? 'Running…' : 'Paused';
    if (running) loop(); else if (rafId) cancelAnimationFrame(rafId);
  });

  resetBtn?.addEventListener('click', () => {
    running = false;
    startStopBtn.textContent = 'Start';
    statusEl.textContent = '';
    w = 0; b = 0;
    updateCandidateLine();
    updateContourPoint();
  });

  // Initialize visuals for (0,0)
  updateCandidateLine();
  updateContourPoint();
});

// Compute MSE for a given slope w and intercept b over observed (x,y)
function mseFor(w, b, pts) {
  const n = pts.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const { x, y } = pts[i];
    const yhat = w * x + b;
    const e = yhat - y;
    sum += e * e;
  }
  return sum / n;
}

function renderMseContour(container, pts) {
  // Choose reasonable ranges around the data
  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const xSpan = Math.max(...xs) - Math.min(...xs);
  const ySpan = Math.max(...ys) - Math.min(...ys);

  // Parameter ranges for slope (w) and intercept (b)
  const wMin = -3, wMax = 3, wSteps = 100;
  const bCenter = 5;
  const bMin = 0, bMax = 10, bSteps = 100;

  const wVals = Array.from({ length: wSteps }, (_, i) => wMin + (i * (wMax - wMin) / (wSteps - 1)));
  const bVals = Array.from({ length: bSteps }, (_, j) => bMin + (j * (bMax - bMin) / (bSteps - 1)));

  // Compute Z grid (b along rows, w along cols)
  const Z = bVals.map(b => wVals.map(w => mseFor(w, b, pts)));

  // Emphasize differences near the minimum by applying a log transform.
  // This compresses high-MSE regions so more contours concentrate around the minimum.
  const eps = 1e-8;
  const Zlog = Z.map(row => row.map(z => Math.log10(Math.max(eps, z))));
  const zFlat = Zlog.flat();
  const sorted = [...zFlat].sort((a, b) => a - b);
  const q = p => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
    return sorted[idx];
  };
  const zmin = q(0.0);
  const zmax = q(0.9); // focus color dynamic range near the minimum

  const contour = {
    x: wVals,
    y: bVals,
    z: Zlog,
    type: 'contour',
    colorscale: 'Viridis',
    reversescale: false,
    contours: { coloring: 'heatmap', showlines: true, ncontours: 60 },
    zmin,
    zmax,
    showscale: false,
  };

  const point00 = {
    x: [0],
    y: [0],
    mode: 'markers',
    marker: { color: 'red', size: 10 },
    name: '(0, 0)'
  };

  const layout = {
    margin: { l: 40, r: 10, t: 10, b: 40 },
    xaxis: { title: 'slope (w)', zeroline: true, range: [wMin, wMax], fixedrange: true },
    yaxis: { title: 'intercept (b)', zeroline: true, range: [bMin, bMax], fixedrange: true },
    showlegend: false,
  };

  const config = {
    displayModeBar: false,
    staticPlot: true,
    responsive: true
  };

  Plotly.newPlot(container, [contour, point00], layout, config);
}
