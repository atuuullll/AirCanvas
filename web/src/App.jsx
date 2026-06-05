import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { motion } from "motion/react";

const WIDTH = 1280;
const HEIGHT = 720;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

const PRESET_TOOLS = [
  { label: "Blue", color: "#1e63ff" },
  { label: "Red", color: "#ff3030" },
  { label: "Green", color: "#13b957" },
  { label: "Eraser", color: "eraser" },
];

const TOOL_ZONES = [
  { label: "Blue", color: "#1e63ff", x1: 250, x2: 430, y1: 58, y2: 104 },
  { label: "Red", color: "#ff3030", x1: 470, x2: 650, y1: 58, y2: 104 },
  { label: "Green", color: "#13b957", x1: 690, x2: 870, y1: 58, y2: 104 },
  { label: "Eraser", color: "eraser", x1: 910, x2: 1090, y1: 58, y2: 104 },
];

const GESTURES = [
  { id: "draw", count: "1", title: "Draw", detail: "Index finger paints" },
  { id: "select", count: "2", title: "Select", detail: "Two fingers choose tools" },
  { id: "eraser", count: "3", title: "Erase", detail: "Three fingers remove paint" },
  { id: "clear", count: "5", title: "Clear", detail: "Open hand resets canvas" },
];

const MotionAside = motion.aside;
const MotionDiv = motion.div;
const MotionSection = motion.section;
const MotionSpan = motion.span;

async function createHandLandmarker(vision, delegate) {
  const options = {
    baseOptions: {
      modelAssetPath: MODEL_URL,
    },
    runningMode: "VIDEO",
    numHands: 1,
  };

  if (delegate) {
    options.baseOptions.delegate = delegate;
  }

  return HandLandmarker.createFromOptions(vision, options);
}

function readableColorName(color) {
  const known = {
    "#1e63ff": "Blue",
    "#ff3030": "Red",
    "#13b957": "Green",
  };
  return known[color.toLowerCase()] || color.toUpperCase();
}

function fingerIsUp(landmarks, tip, pip) {
  return landmarks[tip].y < landmarks[pip].y;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
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
  if (fingers.longFingerCount >= 4) return "clear";
  if (fingers.indexUp && fingers.middleUp && fingers.ringClearlyUp && !fingers.pinkyUp) return "eraser";
  if (fingers.indexUp && fingers.middleUp && !fingers.ringClearlyUp && !fingers.pinkyClearlyUp) return "select";
  if (fingers.indexUp) return "draw";
  return "idle";
}

function App() {
  const videoRef = useRef(null);
  const outputCanvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const layerCanvasesRef = useRef([]);
  const layerContextsRef = useRef([]);
  const previousPointRef = useRef(null);
  const isDrawingStrokeRef = useRef(false);
  const lastClearTimeRef = useRef(0);
  const previousFrameTimeRef = useRef(performance.now());
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const activeLayerRef = useRef(0);
  const currentColorRef = useRef("#1e63ff");
  const brushSizeRef = useRef(15);
  const brushOpacityRef = useRef(1);
  const brushTypeRef = useRef("round");
  const exportFormatRef = useRef("png");

  const [theme, setTheme] = useState("dark");
  const [status, setStatus] = useState("Starting camera...");
  const [gesture, setGesture] = useState("Ready");
  const [fps, setFps] = useState(0);
  const [frameMs, setFrameMs] = useState(0);
  const [fingerCount, setFingerCount] = useState("0/5");
  const [activeLayer, setActiveLayerState] = useState(0);
  const [currentColor, setCurrentColor] = useState("#1e63ff");
  const [colorLabel, setColorLabel] = useState("Blue");
  const [colorHistory, setColorHistory] = useState(["#1e63ff", "#ff3030", "#13b957"]);
  const [brushSize, setBrushSize] = useState(15);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushType, setBrushType] = useState("round");
  const [exportFormat, setExportFormat] = useState("png");

  const redrawDrawingCanvas = useCallback(() => {
    const drawingCtx = drawingCanvasRef.current?.getContext("2d");
    if (!drawingCtx) return;

    // Fill with white background in light theme
    if (theme === "light") {
      drawingCtx.fillStyle = "#ffffff";
      drawingCtx.fillRect(0, 0, WIDTH, HEIGHT);
    } else {
      drawingCtx.clearRect(0, 0, WIDTH, HEIGHT);
    }
    layerCanvasesRef.current.forEach((layer) => {
      drawingCtx.drawImage(layer, 0, 0);
    });
  }, [theme]);

  const captureSnapshot = useCallback(() => {
    return layerContextsRef.current.map((ctx) => ctx.getImageData(0, 0, WIDTH, HEIGHT));
  }, []);

  const restoreSnapshot = useCallback(
    (snapshot) => {
      snapshot.forEach((imageData, index) => {
        layerContextsRef.current[index].putImageData(imageData, 0, 0);
      });
      redrawDrawingCanvas();
    },
    [redrawDrawingCanvas],
  );

  const saveHistory = useCallback(() => {
    undoStackRef.current = [...undoStackRef.current, captureSnapshot()].slice(-30);
    redoStackRef.current = [];
  }, [captureSnapshot]);

  const endStroke = useCallback(() => {
    previousPointRef.current = null;
    isDrawingStrokeRef.current = false;
  }, []);

  const clearDrawing = useCallback(
    (recordHistory = true) => {
      if (recordHistory) saveHistory();
      layerContextsRef.current.forEach((ctx) => ctx.clearRect(0, 0, WIDTH, HEIGHT));
      redrawDrawingCanvas();
      setStatus("Canvas cleared.");
    },
    [redrawDrawingCanvas, saveHistory],
  );

  const undo = useCallback(() => {
    if (!undoStackRef.current.length) {
      setStatus("Nothing to undo.");
      return;
    }

    redoStackRef.current = [...redoStackRef.current, captureSnapshot()];
    const snapshot = undoStackRef.current.pop();
    restoreSnapshot(snapshot);
    setStatus("Undo applied.");
  }, [captureSnapshot, restoreSnapshot]);

  const redo = useCallback(() => {
    if (!redoStackRef.current.length) {
      setStatus("Nothing to redo.");
      return;
    }

    undoStackRef.current = [...undoStackRef.current, captureSnapshot()];
    const snapshot = redoStackRef.current.pop();
    restoreSnapshot(snapshot);
    setStatus("Redo applied.");
  }, [captureSnapshot, restoreSnapshot]);

  const rememberColor = useCallback((color) => {
    if (color === "eraser") return;
    setColorHistory((history) => [color, ...history.filter((item) => item !== color)].slice(0, 8));
  }, []);

  const setTool = useCallback(
    (color) => {
      currentColorRef.current = color;
      setCurrentColor(color);

      if (color === "eraser") {
        setColorLabel("Eraser");
        return;
      }

      setColorLabel(readableColorName(color));
      rememberColor(color);
    },
    [rememberColor],
  );

  const setLayer = useCallback((index) => {
    activeLayerRef.current = index;
    setActiveLayerState(index);
    setStatus(`Layer ${index + 1} selected.`);
  }, []);

  const getExportCanvas = useCallback(() => {
    if (exportFormatRef.current !== "jpeg") return drawingCanvasRef.current;

    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.drawImage(drawingCanvasRef.current, 0, 0);
    return canvas;
  }, []);

  const saveDrawing = useCallback(() => {
    const canvas = getExportCanvas();
    const format = exportFormatRef.current;
    const link = document.createElement("a");
    link.download = `aircanvas-drawing.${format === "jpeg" ? "jpg" : "png"}`;
    link.href = canvas.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", 0.95);
    link.click();
    setStatus(`Drawing saved as ${format.toUpperCase()}.`);
  }, [getExportCanvas]);

  const shareDrawing = useCallback(async () => {
    const canvas = getExportCanvas();
    const format = exportFormatRef.current;
    const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
    const extension = format === "jpeg" ? "jpg" : "png";
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, 0.95));

    if (!blob) {
      setStatus("Share unavailable.");
      return;
    }

    const file = new File([blob], `aircanvas-drawing.${extension}`, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: "AirCanvas drawing", files: [file] });
      setStatus("Share sheet opened.");
      return;
    }

    saveDrawing();
    setStatus("Sharing is not supported here, so the drawing was saved.");
  }, [getExportCanvas, saveDrawing]);

  const drawStroke = useCallback(
    (point, forceEraser = false) => {
      if (!isDrawingStrokeRef.current) {
        saveHistory();
        isDrawingStrokeRef.current = true;
      }

      if (!previousPointRef.current) {
        previousPointRef.current = point;
        return;
      }

      const ctx = layerContextsRef.current[activeLayerRef.current];
      const isEraser = forceEraser || currentColorRef.current === "eraser";
      const pressureWidth = isEraser ? 42 : brushSizeRef.current * point.pressure;

      ctx.save();
      ctx.lineCap = brushTypeRef.current === "square" && !isEraser ? "square" : "round";
      ctx.lineJoin = brushTypeRef.current === "square" && !isEraser ? "miter" : "round";

      if (isEraser) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = 42;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = currentColorRef.current;
        ctx.lineWidth = brushTypeRef.current === "highlighter" ? pressureWidth * 1.8 : pressureWidth;
        ctx.globalAlpha =
          brushTypeRef.current === "highlighter" ? Math.min(brushOpacityRef.current, 0.36) : brushOpacityRef.current;
      }

      ctx.beginPath();
      ctx.moveTo(previousPointRef.current.x, previousPointRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();
      previousPointRef.current = point;
      redrawDrawingCanvas();
    },
    [redrawDrawingCanvas, saveHistory],
  );

  const chooseToolFromPoint = useCallback(
    (point) => {
      const zone = TOOL_ZONES.find(
        (tool) => point.x >= tool.x1 && point.x <= tool.x2 && point.y >= tool.y1 && point.y <= tool.y2,
      );
      if (!zone) return false;

      setTool(zone.color);
      setStatus(`${zone.label} selected.`);
      return true;
    },
    [setTool],
  );

  const drawToolOverlay = useCallback((ctx) => {
    ctx.save();
    ctx.fillStyle = "rgba(8, 13, 20, 0.78)";
    ctx.fillRect(0, 0, WIDTH, 122);

    ctx.font = "22px Inter, Segoe UI, Arial";
    ctx.fillStyle = "#f3f7fb";
    ctx.fillText("Two fingers: move over a swatch to change color", 24, 38);

    ctx.font = "18px Inter, Segoe UI, Arial";
    TOOL_ZONES.forEach((tool) => {
      const isActive = currentColorRef.current === tool.color;
      const width = tool.x2 - tool.x1;
      const height = tool.y2 - tool.y1;

      ctx.fillStyle = tool.color === "eraser" ? "#f7f7f7" : tool.color;
      ctx.fillRect(tool.x1, tool.y1, width, height);

      ctx.lineWidth = isActive ? 5 : 2;
      ctx.strokeStyle = isActive ? "#ffffff" : "rgba(255,255,255,0.35)";
      ctx.strokeRect(tool.x1, tool.y1, width, height);

      ctx.fillStyle = tool.color === "eraser" ? "#101820" : "#ffffff";
      ctx.fillText(tool.label, tool.x1 + 14, tool.y1 + 30);
    });
    ctx.restore();
  }, []);

  const updateFrameStats = useCallback((fingers = null) => {
    const now = performance.now();
    const nextFrameMs = Math.max(now - previousFrameTimeRef.current, 1);
    previousFrameTimeRef.current = now;

    setFps(Math.round(1000 / nextFrameMs));
    setFrameMs(Math.round(nextFrameMs));
    setFingerCount(`${fingers?.total || 0}/5`);
  }, []);

  const drawHandOverlay = useCallback((ctx, landmarks, point, nextGesture) => {
    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.lineWidth = 2;
    HAND_CONNECTIONS.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[start].x * WIDTH, landmarks[start].y * HEIGHT);
      ctx.lineTo(landmarks[end].x * WIDTH, landmarks[end].y * HEIGHT);
      ctx.stroke();
    });

    landmarks.forEach((landmark) => {
      ctx.beginPath();
      ctx.arc(landmark.x * WIDTH, landmark.y * HEIGHT, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#00e0a4";
      ctx.fill();
    });

    ctx.beginPath();
    ctx.arc(point.x, point.y, nextGesture === "select" ? 18 : 10, 0, Math.PI * 2);
    ctx.fillStyle =
      nextGesture === "select"
        ? "rgba(255,255,255,0.8)"
        : currentColorRef.current === "eraser"
          ? "#ffffff"
          : currentColorRef.current;
    ctx.fill();
  }, []);

  useEffect(() => {
    layerCanvasesRef.current = Array.from({ length: 3 }, () => {
      const canvas = document.createElement("canvas");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      return canvas;
    });
    layerContextsRef.current = layerCanvasesRef.current.map((canvas) => canvas.getContext("2d"));
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  useEffect(() => {
    brushOpacityRef.current = brushOpacity / 100;
  }, [brushOpacity]);

  useEffect(() => {
    brushTypeRef.current = brushType;
  }, [brushType]);

  useEffect(() => {
    exportFormatRef.current = exportFormat;
  }, [exportFormat]);

  useEffect(() => {
    const handleKeydown = (event) => {
      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        undo();
      } else if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        redo();
      } else if (!event.ctrlKey && !event.metaKey && key === "s") {
        event.preventDefault();
        saveDrawing();
      } else if (!event.ctrlKey && !event.metaKey && key === "c") {
        event.preventDefault();
        clearDrawing();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [clearDrawing, redo, saveDrawing, undo]);

  useEffect(() => {
    let animationFrame = 0;
    let handLandmarker = null;
    let stream = null;
    let cancelled = false;

    async function start() {
      try {
        if (!window.isSecureContext) {
          setStatus("Camera needs HTTPS. Open the Netlify HTTPS URL, not an http URL.");
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setStatus("This browser does not support webcam access.");
          return;
        }

        setStatus("Loading hand tracking model...");
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        try {
          handLandmarker = await createHandLandmarker(vision, "GPU");
        } catch (gpuError) {
          console.warn("GPU hand tracking failed, falling back to CPU.", gpuError);
          setStatus("GPU hand tracking unavailable. Falling back to CPU...");
          handLandmarker = await createHandLandmarker(vision);
        }

        if (cancelled) return;

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: WIDTH },
              height: { ideal: HEIGHT },
              facingMode: "user",
            },
            audio: false,
          });
        } catch (cameraError) {
          console.warn("Preferred camera constraints failed, retrying with default video.", cameraError);
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setStatus("Camera ready. Use your index finger to draw.");

        const render = () => {
          const outputCanvas = outputCanvasRef.current;
          const outputCtx = outputCanvas?.getContext("2d");
          if (!outputCtx || !video.videoWidth) {
            animationFrame = requestAnimationFrame(render);
            return;
          }

          outputCtx.save();
          outputCtx.clearRect(0, 0, WIDTH, HEIGHT);
          outputCtx.scale(-1, 1);
          outputCtx.translate(-WIDTH, 0);
          outputCtx.drawImage(video, 0, 0, WIDTH, HEIGHT);
          outputCtx.restore();
          drawToolOverlay(outputCtx);

          const result = handLandmarker.detectForVideo(video, performance.now());
          const landmarks = result.landmarks?.[0];

          if (!landmarks) {
            endStroke();
            updateFrameStats();
            setGesture("Ready");
            setStatus("Show your hand to start drawing.");
            animationFrame = requestAnimationFrame(render);
            return;
          }

          const mirroredLandmarks = landmarks.map((landmark) => ({ ...landmark, x: 1 - landmark.x }));
          const fingers = getFingerState(mirroredLandmarks);
          const nextGesture = getGesture(fingers);
          const indexLandmark = mirroredLandmarks[8];
          const point = {
            x: indexLandmark.x * WIDTH,
            y: indexLandmark.y * HEIGHT,
            pressure: Math.min(1.35, Math.max(0.55, 1 - Math.abs(indexLandmark.z || 0) * 4)),
          };

          updateFrameStats(fingers);
          setGesture(nextGesture.charAt(0).toUpperCase() + nextGesture.slice(1));
          drawHandOverlay(outputCtx, mirroredLandmarks, point, nextGesture);

          if (nextGesture === "clear" && Date.now() - lastClearTimeRef.current > 900) {
            endStroke();
            clearDrawing();
            lastClearTimeRef.current = Date.now();
          } else if (nextGesture === "eraser") {
            drawStroke(point, true);
            setStatus("Three fingers: erasing.");
          } else if (nextGesture === "draw") {
            drawStroke(point);
            setStatus(currentColorRef.current === "eraser" ? "Erasing." : "Drawing.");
          } else if (nextGesture === "select") {
            endStroke();
            if (!chooseToolFromPoint(point)) {
              setStatus(`Two fingers: select a color from the top canvas bar (${fingers.total} fingers detected).`);
            }
          } else {
            endStroke();
            setStatus(`Ready (${fingers.total} fingers detected).`);
          }

          animationFrame = requestAnimationFrame(render);
        };

        render();
      } catch (error) {
        console.error(error);
        setStatus("Camera or hand tracking failed. Allow camera access, refresh, and check browser console details.");
      }
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      handLandmarker?.close();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [chooseToolFromPoint, clearDrawing, drawHandOverlay, drawStroke, drawToolOverlay, endStroke, updateFrameStats]);

  const activeGesture = gesture.toLowerCase() === "ready" || gesture.toLowerCase() === "idle" ? "draw" : gesture.toLowerCase();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 transition-colors duration-300 dark:bg-slate-950">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ✨
          </span>
          <span>AirCanvas Pro</span>
        </div>
        <div className="flex items-center gap-2" aria-label="Application actions">
          <button
            className="icon-button"
            type="button"
            aria-label="Toggle theme"
            onClick={() => {
              const nextTheme = theme === "light" ? "dark" : "light";
              setTheme(nextTheme);
              setStatus(`${nextTheme === "light" ? "Light" : "Dark"} theme enabled.`);
            }}
          >
            {theme === "light" ? "☀️" : "🌙"}
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Settings"
            onClick={() => setStatus("Settings are live in the brush, layer, export, and shortcut panels.")}
          >
            🔧
          </button>
        </div>
      </header>

      <section className="workspace" aria-label="AirCanvas dashboard">
        <MotionAside
          className="panel guide-panel p-5"
          aria-label="Gesture guide"
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h2 className="panel-title">Gesture Guide</h2>
          <div className="mt-5 grid gap-3">
            {GESTURES.map((item) => (
              <MotionDiv
                key={item.id}
                className={`gesture-card ${activeGesture === item.id ? "is-active" : ""}`}
                animate={{ scale: activeGesture === item.id ? 1.02 : 1 }}
              >
                <span>{item.count}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </div>
              </MotionDiv>
            ))}
          </div>

          <div className="shortcut-panel" aria-label="Keyboard shortcuts">
            <h3>Shortcuts</h3>
            <div className="shortcut-row">
              <span className="shortcut-keys">
                <kbd>Ctrl</kbd>
                <kbd>Z</kbd>
              </span>
              <span>Undo</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-keys">
                <kbd>Ctrl</kbd>
                <kbd>Y</kbd>
              </span>
              <span>Redo</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-keys">
                <kbd>S</kbd>
              </span>
              <span>Save</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-keys">
                <kbd>C</kbd>
              </span>
              <span>Clear</span>
            </div>
          </div>
        </MotionAside>

        <MotionSection
          className="panel canvas-panel"
          aria-label="Drawing canvas"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <div className="flex items-center justify-between gap-3 pb-3">
            <h1 className="panel-title">Drawing Canvas</h1>
            <MotionSpan
              className="gesture-pill"
              key={gesture}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {gesture}
            </MotionSpan>
          </div>
          <div className="stage">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas ref={outputCanvasRef} width={WIDTH} height={HEIGHT} />
            <canvas ref={drawingCanvasRef} width={WIDTH} height={HEIGHT} />
          </div>
        </MotionSection>

        <MotionAside
          className="panel controls-panel"
          aria-label="Brush controls"
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <h2 className="panel-title">Brush Controls</h2>

          <label className="control-row" htmlFor="brush-size">
            <span>Brush</span>
            <strong>{brushSize}px</strong>
          </label>
          <input
            id="brush-size"
            type="range"
            min="4"
            max="36"
            value={brushSize}
            onChange={(event) => setBrushSize(Number(event.target.value))}
          />

          <label className="control-row" htmlFor="opacity-control">
            <span>Opacity</span>
            <strong>{brushOpacity}%</strong>
          </label>
          <input
            id="opacity-control"
            type="range"
            min="20"
            max="100"
            value={brushOpacity}
            onChange={(event) => setBrushOpacity(Number(event.target.value))}
          />

          <label className="control-row" htmlFor="brush-type">
            <span>Brush Type</span>
          </label>
          <select
            id="brush-type"
            className="select-control"
            value={brushType}
            onChange={(event) => {
              setBrushType(event.target.value);
              setStatus(`${event.target.selectedOptions[0].text} brush selected.`);
            }}
          >
            <option value="round">Round</option>
            <option value="square">Square</option>
            <option value="highlighter">Highlighter</option>
          </select>

          <div className="control-row">
            <span>Color</span>
            <strong>{colorLabel}</strong>
          </div>
          <input
            className="color-picker"
            type="color"
            value={currentColor === "eraser" ? "#ffffff" : currentColor}
            aria-label="Custom color"
            onChange={(event) => setTool(event.target.value)}
          />
          <div className="tool-grid" aria-label="Drawing tools">
            {PRESET_TOOLS.map((tool) => (
              <button
                key={tool.color}
                className={`tool ${currentColor === tool.color ? "is-active" : ""}`}
                type="button"
                aria-label={tool.label}
                onClick={() => setTool(tool.color)}
              >
                {tool.color === "eraser" ? <span className="eraser" /> : <span style={{ background: tool.color }} />}
              </button>
            ))}
          </div>

          <div className="color-history" aria-label="Color history">
            {colorHistory.map((color) => (
              <button
                key={color}
                className="history-swatch"
                type="button"
                style={{ "--swatch": color }}
                aria-label={`Use ${color}`}
                onClick={() => setTool(color)}
              />
            ))}
          </div>

          <div className="layer-panel" aria-label="Layer controls">
            <div className="control-row">
              <span>Layers</span>
              <strong>Layer {activeLayer + 1}</strong>
            </div>
            <div className="layer-buttons">
              {[0, 1, 2].map((layer) => (
                <button
                  key={layer}
                  className={`layer-button ${activeLayer === layer ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setLayer(layer)}
                >
                  {layer + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="action-row">
            <button className="command-button secondary" type="button" onClick={undo}>
              Undo
            </button>
            <button className="command-button secondary" type="button" onClick={redo}>
              Redo
            </button>
          </div>
          <select
            className="select-control"
            aria-label="Export format"
            value={exportFormat}
            onChange={(event) => setExportFormat(event.target.value)}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPG</option>
          </select>
          <button className="command-button" type="button" onClick={saveDrawing}>
            Save
          </button>
          <button className="command-button secondary" type="button" onClick={shareDrawing}>
            Share
          </button>
          <button className="command-button secondary" type="button" onClick={() => clearDrawing()}>
            Clear
          </button>
        </MotionAside>
      </section>

      <footer className="statusbar" aria-label="Application status">
        <span>
          FPS: <strong>{fps}</strong>
        </span>
        <span>
          Frame: <strong>{frameMs}ms</strong>
        </span>
        <span>
          Fingers: <strong>{fingerCount}</strong>
        </span>
        <span>
          Layer: <strong>{activeLayer + 1}</strong>
        </span>
        <span>
          Status:{" "}
          <strong role="status" aria-live="polite">
            {status}
          </strong>
        </span>
      </footer>
    </main>
  );
}

export default App;
