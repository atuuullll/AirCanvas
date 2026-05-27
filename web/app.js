const videoElement = document.querySelector(".input-video");
const outputCanvas = document.getElementById("output-canvas");
const drawingCanvas = document.getElementById("drawing-canvas");
const outputCtx = outputCanvas.getContext("2d");
const drawingCtx = drawingCanvas.getContext("2d");
const statusEl = document.getElementById("status");
const tools = [...document.querySelectorAll(".tool")];
const clearButton = document.getElementById("clear-button");

let currentColor = "#1e63ff";
let previousPoint = null;
let brushSize = 12;
let eraserSize = 42;
let lastGesture = "";
let lastClearTime = 0;

const toolZones = [
  { label: "Blue", color: "#1e63ff", x1: 250, x2: 430 },
  { label: "Red", color: "#ff3030", x1: 470, x2: 650 },
  { label: "Green", color: "#13b957", x1: 690, x2: 870 },
  { label: "Eraser", color: "eraser", x1: 910, x2: 1090 },
];

function setStatus(message) {
  statusEl.textContent = message;
}

function setTool(color) {
  currentColor = color;
  tools.forEach((tool) => {
    tool.classList.toggle("is-active", tool.dataset.color === color);
  });
}

function clearDrawing() {
  drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function fingerIsUp(landmarks, tip, pip) {
  return landmarks[tip].y < landmarks[pip].y;
}

function getFingerState(landmarks) {
  const indexUp = fingerIsUp(landmarks, 8, 6);
  const middleUp = fingerIsUp(landmarks, 12, 10);
  const ringUp = fingerIsUp(landmarks, 16, 14);
  const ringClearlyUp = landmarks[16].y < landmarks[14].y - 0.06;
  const pinkyUp = fingerIsUp(landmarks, 20, 18);
  const pinkyClearlyUp = landmarks[20].y < landmarks[18].y - 0.04;
  const thumbOpen = distance(landmarks[4], landmarks[17]) > distance(landmarks[2], landmarks[17]);
  const longFingerCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
  const total = [thumbOpen, indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

  return {
    indexUp,
    middleUp,
    ringUp,
    ringClearlyUp,
    pinkyUp,
    pinkyClearlyUp,
    thumbOpen,
    longFingerCount,
    total,
  };
}

function getGesture(fingers) {
  const { indexUp, middleUp, ringClearlyUp, pinkyUp, pinkyClearlyUp, longFingerCount } = fingers;

  if (longFingerCount >= 4) return "clear";
  if (indexUp && middleUp && ringClearlyUp && !pinkyUp) return "eraser";
  if (indexUp && middleUp && !ringClearlyUp && !pinkyClearlyUp) return "select";
  if (indexUp) return "draw";
  return "idle";
}

function canvasPoint(landmark) {
  return {
    x: landmark.x * drawingCanvas.width,
    y: landmark.y * drawingCanvas.height,
  };
}

function drawStroke(point, forceEraser = false) {
  if (!previousPoint) {
    previousPoint = point;
    return;
  }

  drawingCtx.save();
  drawingCtx.lineCap = "round";
  drawingCtx.lineJoin = "round";

  if (forceEraser || currentColor === "eraser") {
    drawingCtx.globalCompositeOperation = "destination-out";
    drawingCtx.lineWidth = eraserSize;
  } else {
    drawingCtx.globalCompositeOperation = "source-over";
    drawingCtx.strokeStyle = currentColor;
    drawingCtx.lineWidth = brushSize;
  }

  drawingCtx.beginPath();
  drawingCtx.moveTo(previousPoint.x, previousPoint.y);
  drawingCtx.lineTo(point.x, point.y);
  drawingCtx.stroke();
  drawingCtx.restore();
  previousPoint = point;
}

function drawToolOverlay() {
  outputCtx.fillStyle = "rgba(8, 10, 12, 0.72)";
  outputCtx.fillRect(0, 0, outputCanvas.width, 104);
  outputCtx.font = "22px Segoe UI, Arial";
  outputCtx.fillStyle = "#f5f7fb";
  outputCtx.fillText("Index: draw  |  2 fingers: select  |  3 fingers: eraser  |  4/5 fingers: clear", 24, 44);

  outputCtx.font = "18px Segoe UI, Arial";
  toolZones.forEach((tool) => {
    const isActive = currentColor === tool.color;
    outputCtx.fillStyle = tool.color === "eraser" ? "#f5f7fb" : tool.color;
    outputCtx.fillRect(tool.x1, 64, tool.x2 - tool.x1, 28);
    outputCtx.strokeStyle = isActive ? "#ffffff" : "rgba(255,255,255,0.35)";
    outputCtx.lineWidth = isActive ? 4 : 2;
    outputCtx.strokeRect(tool.x1, 64, tool.x2 - tool.x1, 28);
    outputCtx.fillStyle = tool.color === "eraser" ? "#111418" : "#ffffff";
    outputCtx.fillText(tool.label, tool.x1 + 14, 85);
  });
}

function drawFingerDebug(fingers, gesture) {
  outputCtx.fillStyle = "rgba(8, 10, 12, 0.72)";
  outputCtx.fillRect(18, outputCanvas.height - 48, 460, 32);
  outputCtx.font = "18px Segoe UI, Arial";
  outputCtx.fillStyle = "#f5f7fb";
  outputCtx.fillText(
    `Gesture: ${gesture} | I:${Number(fingers.indexUp)} M:${Number(fingers.middleUp)} R:${Number(fingers.ringUp)} P:${Number(fingers.pinkyUp)}`,
    30,
    outputCanvas.height - 26,
  );
}

function chooseToolFromPoint(point) {
  if (point.y < 56 || point.y > 104) return false;

  const zone = toolZones.find((tool) => point.x >= tool.x1 && point.x <= tool.x2);
  if (!zone) return false;

  setTool(zone.color);
  setStatus(`${zone.label} selected`);
  return true;
}

function drawPointer(point, gesture) {
  outputCtx.beginPath();
  outputCtx.arc(point.x, point.y, gesture === "select" ? 18 : 10, 0, Math.PI * 2);
  outputCtx.fillStyle = gesture === "select" ? "rgba(255,255,255,0.8)" : currentColor === "eraser" ? "#ffffff" : currentColor;
  outputCtx.fill();
}

function onResults(results) {
  outputCtx.save();
  outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputCtx.scale(-1, 1);
  outputCtx.translate(-outputCanvas.width, 0);
  outputCtx.drawImage(results.image, 0, 0, outputCanvas.width, outputCanvas.height);
  outputCtx.restore();

  drawToolOverlay();

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    previousPoint = null;
    setStatus("Show your hand to start drawing.");
    return;
  }

  const landmarks = results.multiHandLandmarks[0].map((point) => ({
    ...point,
    x: 1 - point.x,
  }));
  const fingers = getFingerState(landmarks);
  const gesture = getGesture(fingers);
  const indexPoint = canvasPoint(landmarks[8]);

  drawConnectors(outputCtx, landmarks, HAND_CONNECTIONS, { color: "#ffffff", lineWidth: 2 });
  drawLandmarks(outputCtx, landmarks, { color: "#00e0a4", lineWidth: 1, radius: 3 });
  drawPointer(indexPoint, gesture);
  drawFingerDebug(fingers, gesture);

  if (gesture === "clear" && Date.now() - lastClearTime > 900) {
    clearDrawing();
    lastClearTime = Date.now();
    setStatus("Canvas cleared.");
  } else if (gesture === "eraser") {
    drawStroke(indexPoint, true);
    setStatus("Three fingers: erasing");
  } else if (gesture === "draw") {
    drawStroke(indexPoint);
    setStatus(currentColor === "eraser" ? "Erasing" : "Drawing");
  } else if (gesture === "select") {
    previousPoint = null;
    if (!chooseToolFromPoint(indexPoint)) {
      setStatus(`Two fingers: select mode (${fingers.total} fingers detected)`);
    }
  } else {
    previousPoint = null;
    setStatus(`Ready (${fingers.total} fingers detected)`);
  }

  lastGesture = gesture;
}

tools.forEach((tool) => {
  tool.addEventListener("click", () => setTool(tool.dataset.color));
});

clearButton.addEventListener("click", clearDrawing);

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.72,
  minTrackingConfidence: 0.72,
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 1280,
  height: 720,
});

camera.start()
  .then(() => setStatus("Camera ready. Use your index finger to draw."))
  .catch(() => {
    setStatus("Camera blocked. Allow webcam access and run this from localhost or HTTPS.");
  });
