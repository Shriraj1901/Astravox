import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/weights';

let modelsLoaded = false;
let loadingPromise = null;

export const loadFaceModels = () => {
  if (modelsLoaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
  ]).then(() => {
    modelsLoaded = true;
  });

  return loadingPromise;
};

export const detectFaces = async (videoElement) => {
  if (!modelsLoaded || !videoElement) return [];
  const detections = await faceapi
    .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceExpressions();
  return detections;
};
export const aggregateFaceSamples = (samples) => {
  if (samples.length === 0) {
    return {
      facePresentPercent: null,
      multipleFacesCount: 0,
      noFaceCount: 0,
      dominantExpression: null,
    };
  }

  const totalSamples = samples.length;
  const withOneFace = samples.filter((s) => s.faceCount === 1).length;
  const multipleFacesCount = samples.filter((s) => s.faceCount > 1).length;
  const noFaceCount = samples.filter((s) => s.faceCount === 0).length;

  const expressionTotals = {};
  samples.forEach((s) => {
    if (s.expression) {
      expressionTotals[s.expression] = (expressionTotals[s.expression] || 0) + 1;
    }
  });

  let dominantExpression = null;
  let maxCount = 0;
  Object.entries(expressionTotals).forEach(([expr, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantExpression = expr;
    }
  });

  return {
    facePresentPercent: Math.round((withOneFace / totalSamples) * 100),
    multipleFacesCount,
    noFaceCount,
    dominantExpression,
  };
};

export { faceapi };