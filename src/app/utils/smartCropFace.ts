"use client";

let faceDetector: any;

const withSilencedMediapipe = async <T>(fn: () => Promise<T> | T) => {
  const orig = console.error;
  console.error = (...args) => {
    const m = String(args?.[0] ?? "");
    if (m.startsWith("INFO:")) return;
    if (m.startsWith("ERROR: The model is not a valid Flatbuffer buffer"))
      return;
    orig(...args);
  };
  try {
    return await fn();
  } finally {
    console.error = orig;
  }
};

export const ensureFaceDetector = async () => {
  if (faceDetector) return faceDetector;
  const { FilesetResolver, FaceDetector } = await import(
    "@mediapipe/tasks-vision"
  );
  const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  // Use local short-range face detector model
  const tryModels = ["/mediapipe/models/blaze_face_short_range.tflite"];

  const likelyValid = async (url: string) => {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) return false;
      const len = Number(res.headers.get("content-length") || "0");
      return len > 10000;
    } catch {
      return false;
    }
  };

  const candidates: string[] = [];
  for (const url of tryModels) {
    // eslint-disable-next-line no-await-in-loop
    if (await likelyValid(url)) candidates.push(url);
  }
  if (candidates.length === 0) candidates.push(tryModels[1]);

  let lastError: any = null;
  for (const modelUrl of candidates) {
    try {
      faceDetector = await withSilencedMediapipe(() =>
        (FaceDetector as any).createFromModelPath(vision, modelUrl)
      );
      break;
    } catch (err) {
      lastError = err;
      faceDetector = null;
    }
  }
  if (!faceDetector)
    throw lastError || new Error("Failed to init FaceDetector");
  return faceDetector;
};

type SmartCropParams = {
  img: HTMLImageElement;
  padding?: number;
  aspect?: number;
  mime?: string;
  quality?: number;
  maxFaces?: number;
  debug?: boolean;
};

export const smartCropFace = async ({
  img,
  padding = 0.25,
  aspect = 1,
  mime = "image/jpeg",
  quality = 0.92,
  maxFaces = 4,
  debug = false,
}: SmartCropParams): Promise<{
  faces: string[];
  debug?: { personCrops?: string[] };
}> => {
  let boxes = await detectBoxes({ img });
  const debugOut: { personCrops?: string[] } = {};
  if (!boxes.length) {
    // Fallback: person segmentation to focus crop on upper body, then re-run face detect
    try {
      const { FilesetResolver, ImageSegmenter } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const seg = await withSilencedMediapipe(() =>
        (ImageSegmenter as any).createFromOptions(
          vision as any,
          {
            baseOptions: {
              modelAssetPath: "/mediapipe/models/deeplabv3.tflite",
            },
            outputCategoryMask: true,
            runningMode: "IMAGE",
          } as any
        )
      );
      const res: any = await withSilencedMediapipe(() =>
        (seg as any).segment(img)
      );
      const mask = res?.categoryMask?.getAsUint8Array?.();
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (mask && mask.length === iw * ih) {
        // Build per-column coverage to tighten width to actual person region(s)
        const minYPerX: number[] = new Array(iw).fill(ih);
        const maxYPerX: number[] = new Array(iw).fill(-1);
        const hitsPerX: number[] = new Array(iw).fill(0);
        for (let y = 0; y < ih; y++) {
          for (let x = 0; x < iw; x++) {
            const v = mask[y * iw + x];
            if (v > 0) {
              if (y < minYPerX[x]) minYPerX[x] = y;
              if (y > maxYPerX[x]) maxYPerX[x] = y;
              hitsPerX[x] += 1;
            }
          }
        }
        // Extract contiguous clusters of columns with coverage
        const clusters: Array<{ start: number; end: number }> = [];
        const minCoverageFrac = 0.01; // 1% of rows
        let i = 0;
        while (i < iw) {
          if (hitsPerX[i] / ih < minCoverageFrac) {
            i += 1;
            continue;
          }
          const start = i;
          while (i < iw && hitsPerX[i] / ih >= minCoverageFrac) i += 1;
          const end = i - 1;
          clusters.push({ start, end });
        }

        const personCrops: string[] = [];
        const newBoxes: Array<{
          x: number;
          y: number;
          width: number;
          height: number;
        }> = [];

        for (const cl of clusters) {
          const minX = cl.start;
          const maxX = cl.end;
          let minY = ih;
          let maxY = -1;
          for (let x = minX; x <= maxX; x++) {
            if (minYPerX[x] < minY) minY = minYPerX[x];
            if (maxYPerX[x] > maxY) maxY = maxYPerX[x];
          }
          if (maxY <= minY || maxX <= minX) continue;
          const w = maxX - minX + 1;
          const h = maxY - minY + 1;

          // Find densest columns in the top band to better center the head
          const bandH = Math.max(Math.round(h * 0.4), 80);
          const bandBottom = Math.min(ih - 1, minY + bandH);
          const hitsBand: number[] = new Array(w).fill(0);
          for (let x = minX; x <= maxX; x++) {
            let cnt = 0;
            for (let y = minY; y <= bandBottom; y++)
              if (mask[y * iw + x] > 0) cnt++;
            hitsBand[x - minX] = cnt;
          }
          const thr = (bandBottom - minY + 1) * 0.12; // 12% positive pixels in band
          let newMinX = maxX;
          let newMaxX = minX;
          for (let i2 = 0; i2 < hitsBand.length; i2++) {
            if (hitsBand[i2] >= thr) {
              const absX = minX + i2;
              if (absX < newMinX) newMinX = absX;
              if (absX > newMaxX) newMaxX = absX;
            }
          }
          if (!(newMaxX > newMinX)) {
            const third = Math.max(Math.round(w / 3), 30);
            const cx = Math.round((minX + maxX) / 2);
            newMinX = Math.max(minX, cx - Math.floor(third / 2));
            newMaxX = Math.min(maxX, newMinX + third);
          }
          const fw = newMaxX - newMinX + 1;
          const marginX = Math.round(fw * 0.06);
          const marginY = Math.round(h * 0.05);
          const cropX = Math.max(0, newMinX - marginX);
          const cropY = Math.max(0, minY - marginY);
          const cropW = Math.min(iw - cropX, fw + 2 * marginX);
          const fullCropH = Math.min(ih - cropY, h + 2 * marginY);
          const cropH = Math.max(Math.round(fullCropH * 0.45), 60);

          const c = document.createElement("canvas");
          c.width = cropW;
          c.height = cropH;
          const ctx = c.getContext("2d");
          if (!ctx) continue;
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          // Upscale small crops to ensure the face has enough pixels
          let detectCanvas: HTMLCanvasElement = c;
          let scale = 1;
          const targetMin = 640;
          const needScale = Math.max(targetMin / cropW, targetMin / cropH);
          if (needScale > 1.01) {
            scale = needScale;
            const cs = document.createElement("canvas");
            cs.width = Math.round(cropW * scale);
            cs.height = Math.round(cropH * scale);
            const csx = cs.getContext("2d", { willReadFrequently: false });
            if (csx) {
              csx.imageSmoothingEnabled = true;
              csx.imageSmoothingQuality = "high" as any;
              csx.drawImage(c, 0, 0, cs.width, cs.height);
              detectCanvas = cs;
            }
          }

          if (debug) {
            // eslint-disable-next-line no-await-in-loop
            const url = await new Promise<string | null>((res) =>
              detectCanvas.toBlob(
                (b) => res(b ? URL.createObjectURL(b) : null),
                mime,
                quality
              )
            );
            if (url) personCrops.push(url);
          }

          const fd = await ensureFaceDetector();
          // eslint-disable-next-line no-await-in-loop
          const again = await withSilencedMediapipe(() =>
            (fd as any).detect(detectCanvas)
          );
          const dets = (again?.detections || []).map((d: any) => ({
            x: cropX + d.boundingBox.originX / scale,
            y: cropY + d.boundingBox.originY / scale,
            width: d.boundingBox.width / scale,
            height: d.boundingBox.height / scale,
          }));
          newBoxes.push(...dets);
        }

        if (personCrops.length && debug) debugOut.personCrops = personCrops;
        if (newBoxes.length) boxes = newBoxes;
      }
    } catch {}
  }
  if (!boxes.length) return { faces: [], debug: debugOut };

  const selectedFaces = selectBestFaces(boxes, maxFaces);
  const results: string[] = [];

  for (const box of selectedFaces) {
    const crop = expandToAspect({
      box: { x: box.x, y: box.y, w: box.width, h: box.height },
      iw: img.naturalWidth,
      ih: img.naturalHeight,
      padding,
      aspect,
    });

    const canvas = document.createElement("canvas");
    canvas.width = crop.w;
    canvas.height = crop.h;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) continue;
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);

    const url = await new Promise<string | null>((res) =>
      canvas.toBlob(
        (b) => res(b ? URL.createObjectURL(b) : null),
        mime,
        quality
      )
    );
    if (url) results.push(url);
  }

  return { faces: results, debug: debugOut };
};

const detectBoxes = async ({ img }: { img: HTMLImageElement }) => {
  // 1) Try Shape Detection API first
  if ("FaceDetector" in globalThis) {
    try {
      // @ts-ignore
      const fd = new (globalThis as any).FaceDetector({
        fastMode: true,
        maxDetectedFaces: 10,
      });
      const faces = await fd.detect(img);
      const boxes = faces.map((f: any) => ({
        x: f.boundingBox.x,
        y: f.boundingBox.y,
        width: f.boundingBox.width,
        height: f.boundingBox.height,
      }));
      if (boxes.length) return boxes;
    } catch {}
  }

  // 2) MediaPipe detector, with multi-scale upsampling for small faces
  const fd = await ensureFaceDetector();
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const run = async (input: HTMLImageElement | HTMLCanvasElement) => {
    const res = await withSilencedMediapipe(() => fd.detect(input));
    return (res?.detections || []).map((d: any) => ({
      x: d.boundingBox.originX,
      y: d.boundingBox.originY,
      width: d.boundingBox.width,
      height: d.boundingBox.height,
    }));
  };

  let boxes = await run(img);

  const largestArea = boxes.length
    ? Math.max(
        ...boxes.map(
          (b: { width: number; height: number }) => b.width * b.height
        )
      )
    : 0;
  const frac = largestArea / Math.max(1, iw * ih);

  if (!boxes.length || frac < 0.02) {
    const scales = [1.5, 2, 3];
    for (const s of scales) {
      const cw = Math.min(Math.round(iw * s), 2500);
      const ch = Math.min(Math.round(ih * s), 2500);
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high" as any;
      ctx.drawImage(img, 0, 0, cw, ch);
      // eslint-disable-next-line no-await-in-loop
      const ups = await run(canvas);
      const mapped = ups.map(
        (b: { x: number; y: number; width: number; height: number }) => ({
          x: b.x / s,
          y: b.y / s,
          width: b.width / s,
          height: b.height / s,
        })
      );
      boxes = boxes.concat(mapped);
    }
  }

  // dedupe by center proximity
  const uniq: Array<{ x: number; y: number; width: number; height: number }> =
    [];
  for (const b of boxes.sort(
    (
      a: { width: number; height: number },
      bb: { width: number; height: number }
    ) => {
      return bb.width * bb.height - a.width * a.height;
    }
  )) {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const tooClose = uniq.some((u) => {
      const ux = u.x + u.width / 2;
      const uy = u.y + u.height / 2;
      const dist = Math.hypot(cx - ux, cy - uy);
      const size = Math.max(b.width, b.height, u.width, u.height);
      return dist < size * 0.3;
    });
    if (!tooClose) uniq.push(b);
  }
  return uniq;
};

const selectBestFaces = (
  boxes: Array<{ x: number; y: number; width: number; height: number }>,
  maxFaces: number
) => {
  if (boxes.length === 0) return [];

  // Sort by size (area) descending
  const sorted = boxes.sort((a, b) => b.width * b.height - a.width * a.height);

  // If we have many faces, try to filter out background faces
  if (sorted.length > maxFaces) {
    const largestArea = sorted[0].width * sorted[0].height;
    const sizeThreshold = largestArea * 0.15; // Background faces are typically <15% of largest

    // Keep faces that are reasonably large (foreground)
    const foregroundFaces = sorted.filter(
      (box) => box.width * box.height >= sizeThreshold
    );

    // If we have enough foreground faces, use those; otherwise fall back to largest overall
    if (foregroundFaces.length >= 2) {
      return foregroundFaces.slice(0, maxFaces);
    }
  }

  return sorted.slice(0, maxFaces);
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const expandToAspect = ({
  box,
  iw,
  ih,
  padding,
  aspect,
}: {
  box: { x: number; y: number; w: number; h: number };
  iw: number;
  ih: number;
  padding: number;
  aspect: number;
}) => {
  const padX = box.w * padding;
  const padY = box.h * padding;
  let x = Math.floor(box.x - padX);
  let y = Math.floor(box.y - padY);
  let w = Math.ceil(box.w + padX * 2);
  let h = Math.ceil(box.h + padY * 2);

  const want = aspect;
  const cur = w / h;
  if (cur > want) {
    const nh = Math.round(w / want);
    const dy = Math.round((nh - h) / 2);
    y -= dy;
    h = nh;
  } else if (cur < want) {
    const nw = Math.round(h * want);
    const dx = Math.round((nw - w) / 2);
    x -= dx;
    w = nw;
  }

  x = clamp(x, 0, iw - 1);
  y = clamp(y, 0, ih - 1);
  w = Math.min(w, iw - x);
  h = Math.min(h, ih - y);

  return { x, y, w, h };
};
