/**
 * MediaPipe Hand Detection & Gesture Classification Service
 * Robust landmark tracking, distance diagnostics, lighting analysis,
 * and neon skeleton overlay visualizer.
 */

import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

// Connections between hand landmarks according to MediaPipe Hand schema
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base
  [5, 9], [9, 13], [13, 17]
];

export class GestureDetector {
  constructor(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;

    this.stream = null;
    this.handLandmarker = null;
    this.isModelLoaded = false;
    this.isRunning = false;
    this.rafId = null;

    // Detection State
    this.lastDetectedGesture = null;
    this.gestureStability = 0;
    this.currentLandmarks = null;
    this.handDistanceStatus = "no_hand"; // "no_hand", "too_far", "too_close", "edge", "good"
    this.lightingStatus = "good"; // "good", "low_light", "overexposed"
    this.showLandmarks = true;

    // Callback on frame updates
    this.onFrameCallback = null;

    // Small offscreen canvas for fast lighting sampling
    this.sampleCanvas = document.createElement('canvas');
    this.sampleCanvas.width = 32;
    this.sampleCanvas.height = 24;
    this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
  }

  async loadModel() {
    if (this.isModelLoaded && this.handLandmarker) return;
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      this.isModelLoaded = true;
    } catch (err) {
      console.error("Failed to initialize MediaPipe HandLandmarker:", err);
      throw new Error("Could not load MediaPipe computer vision model. Please check your internet connection.");
    }
  }

  async startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera API not supported. Please use Chrome, Edge, or Safari on HTTPS or localhost.");
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      this.video.srcObject = this.stream;
      await new Promise((resolve, reject) => {
        this.video.onloadedmetadata = () => {
          this.video.play().then(resolve).catch(reject);
        };
        this.video.onerror = () => reject(new Error("Unable to stream camera feed."));
      });

      this.isRunning = true;
      this.startDetectionLoop();
    } catch (err) {
      let msg = "Could not access camera.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Camera permission was denied. Please allow camera access in your browser settings (look for the camera icon in your address bar).";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "No camera was detected. Please connect a webcam and reload.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        msg = "Camera is already in use by another application. Please close other camera apps and try again.";
      }
      throw new Error(msg);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.currentLandmarks = null;
    this.lastDetectedGesture = null;
    this.gestureStability = 0;
  }

  startDetectionLoop() {
    const loop = () => {
      if (!this.isRunning) return;
      this.processFrame();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  processFrame() {
    if (!this.handLandmarker || !this.video || this.video.readyState < 2) return;

    // Sync canvas sizing with video display
    if (this.canvas) {
      const vWidth = this.video.videoWidth || 640;
      const vHeight = this.video.videoHeight || 480;
      if (this.canvas.width !== vWidth || this.canvas.height !== vHeight) {
        this.canvas.width = vWidth;
        this.canvas.height = vHeight;
      }
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Estimate lighting
    this.checkLighting();

    const timestamp = performance.now();
    let result = null;
    try {
      result = this.handLandmarker.detectForVideo(this.video, timestamp);
    } catch (err) {
      return;
    }

    if (result && result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      this.currentLandmarks = landmarks;

      // Analyze bounding box and distance
      this.analyzeHandGeometry(landmarks);

      // Classify gesture
      const gesture = this.classifyGesture(landmarks);
      if (gesture) {
        if (gesture === this.lastDetectedGesture) {
          this.gestureStability++;
        } else {
          this.lastDetectedGesture = gesture;
          this.gestureStability = 1;
        }
      } else {
        this.lastDetectedGesture = null;
        this.gestureStability = 0;
      }

      // Render Skeleton Overlay
      if (this.showLandmarks && this.canvas && this.ctx) {
        this.drawSkeleton(landmarks);
      }
    } else {
      this.currentLandmarks = null;
      this.lastDetectedGesture = null;
      this.gestureStability = 0;
      this.handDistanceStatus = "no_hand";
    }

    if (this.onFrameCallback) {
      this.onFrameCallback({
        gesture: this.lastDetectedGesture,
        stability: this.gestureStability,
        distanceStatus: this.handDistanceStatus,
        lightingStatus: this.lightingStatus,
        hasHand: !!this.currentLandmarks
      });
    }
  }

  /**
   * Classify Stone, Paper, or Scissors based on anatomical landmark coordinates.
   */
  classifyGesture(landmarks) {
    const wrist = landmarks[0];
    const fingerTips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];
    const mcps = [5, 9, 13, 17];

    // Compute extension for index, middle, ring, pinky
    const extended = fingerTips.map((tip, i) => {
      const t = landmarks[tip];
      const p = landmarks[pips[i]];
      const m = landmarks[mcps[i]];
      const dTip = Math.hypot(t.x - wrist.x, t.y - wrist.y);
      const dMcp = Math.hypot(m.x - wrist.x, m.y - wrist.y);
      return (
        dTip > dMcp * 1.12 &&
        (i === 0
          ? Math.hypot(t.x - landmarks[5].x, t.y - landmarks[5].y) >
            Math.hypot(landmarks[6].x - landmarks[5].x, landmarks[6].y - landmarks[5].y) * 1.15
          : t.y < p.y + 0.015)
      );
    });

    // Thumb extension measurement
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const indexMcp = landmarks[5];
    const pinkyMcp = landmarks[17];
    const palmWidth = Math.hypot(indexMcp.x - pinkyMcp.x, indexMcp.y - pinkyMcp.y);
    const thumbExtended =
      Math.hypot(thumbTip.x - indexMcp.x, thumbTip.y - indexMcp.y) >
      Math.hypot(thumbIp.x - indexMcp.x, thumbIp.y - indexMcp.y) + palmWidth * 0.12;

    const count = extended.filter(Boolean).length;

    // PAPER: 4 or 5 extended fingers
    if (count >= 4) return "paper";

    // SCISSORS: Index and middle extended, ring and pinky closed
    if (extended[0] && extended[1] && !extended[2] && !extended[3]) return "scissors";

    // STONE: Fist (<= 1 extended finger, neither index nor middle fully extended)
    if (count <= 1 && !extended[0] && !extended[1]) return "stone";

    // Common two-finger variation for scissors
    if (count === 2 && extended[0] && extended[1]) return "scissors";

    return null;
  }

  /**
   * Evaluates hand bounding box and distance from camera.
   */
  analyzeHandGeometry(landmarks) {
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const lm of landmarks) {
      if (lm.x < minX) minX = lm.x;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.y > maxY) maxY = lm.y;
    }

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    const boxArea = boxWidth * boxHeight;

    if (boxArea < 0.035) {
      this.handDistanceStatus = "too_far";
    } else if (boxArea > 0.65) {
      this.handDistanceStatus = "too_close";
    } else if (minX < 0.04 || maxX > 0.96 || minY < 0.04 || maxY > 0.96) {
      this.handDistanceStatus = "edge";
    } else {
      this.handDistanceStatus = "good";
    }
  }

  /**
   * Fast sample of lighting / brightness from camera video
   */
  checkLighting() {
    try {
      this.sampleCtx.drawImage(this.video, 0, 0, 32, 24);
      const imgData = this.sampleCtx.getImageData(0, 0, 32, 24).data;
      let totalLuma = 0;
      const count = imgData.length / 4;
      for (let i = 0; i < imgData.length; i += 4) {
        totalLuma += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
      }
      const avgBrightness = totalLuma / count;
      if (avgBrightness < 35) {
        this.lightingStatus = "low_light";
      } else if (avgBrightness > 235) {
        this.lightingStatus = "overexposed";
      } else {
        this.lightingStatus = "good";
      }
    } catch (e) {
      this.lightingStatus = "good";
    }
  }

  /**
   * Draw glowing futuristic skeleton on the canvas.
   * Note: The video is CSS mirrored (scaleX(-1)), so the canvas coordinates
   * are flipped horizontally (1 - x) to align seamlessly with the mirrored camera.
   */
  drawSkeleton(landmarks) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // Draw connection lines
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(0, 240, 255, 0.75)";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 8;

    for (const [start, end] of HAND_CONNECTIONS) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      // Mirror x coordinate to match mirrored video
      const x1 = (1 - p1.x) * w;
      const y1 = p1.y * h;
      const x2 = (1 - p2.x) * w;
      const y2 = p2.y * h;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Draw landmark joints
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const x = (1 - lm.x) * w;
      const y = lm.y * h;

      ctx.beginPath();
      // Tips (4, 8, 12, 16, 20) are highlighted with magenta/pink
      if ([4, 8, 12, 16, 20].includes(i)) {
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = "#ff2a85";
        ctx.shadowColor = "#ff2a85";
        ctx.shadowBlur = 10;
      } else {
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#38e8ff";
        ctx.shadowColor = "#38e8ff";
        ctx.shadowBlur = 6;
      }
      ctx.fill();
    }

    // Reset shadow
    ctx.shadowBlur = 0;
  }

  /**
   * Returns guidance message based on current hand & lighting status
   */
  getFeedbackMessage() {
    if (this.lightingStatus === "low_light") {
      return "⚠️ Low lighting detected. Move to a well-lit area for best accuracy.";
    }
    if (this.lightingStatus === "overexposed") {
      return "⚠️ Direct glare detected. Avoid pointing camera directly at bright lights.";
    }

    switch (this.handDistanceStatus) {
      case "no_hand":
        return "Show your hand clearly to the camera";
      case "too_far":
        return "Move your hand closer to the camera";
      case "too_close":
        return "Hand too close! Move slightly back";
      case "edge":
        return "Center your hand inside the frame";
      case "good":
        if (this.lastDetectedGesture) {
          const names = { stone: "✊ STONE", paper: "✋ PAPER", scissors: "✌️ SCISSORS" };
          return `Hand detected: ${names[this.lastDetectedGesture]} (${this.gestureStability >= 2 ? "Locked" : "Tracking..."})`;
        }
        return "Hand detected — Hold a clear pose!";
      default:
        return "Position one hand in front of the camera";
    }
  }
}
