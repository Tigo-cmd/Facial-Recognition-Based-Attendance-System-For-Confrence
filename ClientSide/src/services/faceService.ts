// faceService.ts
import * as faceapi from 'face-api.js';
import { Attendee, RecognitionResult } from '../types';

/**
 * Guarded euclideanDistance function.
 * Returns Infinity if vectors differ in length, so no match.
 */
export function euclideanDistance(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length) {
    console.warn(
      `euclideanDistance: length mismatch (${arr1.length} vs ${arr2.length}), skipping comparison.`
    );
    return Infinity;
  }
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const d = arr1[i] - arr2[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export class FaceService {
  private static readonly SIMILARITY_THRESHOLD = 0.6;

  /**
   * Wait until video.readyState >= 2 and video dimensions > 0, up to timeout ms.
   */
  private static waitForVideoFrame(
    video: HTMLVideoElement,
    timeout = 2000
  ): Promise<void> {
    const interval = 100;
    let elapsed = 0;
    return new Promise((resolve, reject) => {
      const check = () => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          resolve();
        } else {
          elapsed += interval;
          if (elapsed >= timeout) {
            reject(new Error('Video not ready for face detection (timeout)'));
          } else {
            setTimeout(check, interval);
          }
        }
      };
      check();
    });
  }

  /**
   * Detect a single face with landmarks and descriptor from a <video> element.
   * Returns null if no face found or error.
   */
  static async detectFace(
    video: HTMLVideoElement
  ): Promise<
    | faceapi.WithFaceDescriptor<
        faceapi.WithFaceLandmarks<
          faceapi.WithFaceDetection<{}>,
          faceapi.FaceLandmarks68
        >
      >
    | null
  > {
    try {
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('detectFace: video not ready, readyState:', video.readyState);
        return null;
      }
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      return detection || null;
    } catch (error) {
      console.error('Face detection error:', error);
      return null;
    }
  }

  /**
   * Extract a face descriptor; waits briefly for a frame if needed.
   * Throws if still no face.
   */
  static async extractFaceDescriptor(video: HTMLVideoElement): Promise<number[]> {
    await this.waitForVideoFrame(video, 2000);
    const detection = await this.detectFace(video);
    if (!detection) {
      throw new Error('No face detected. Please ensure your face is clearly visible and well-lit.');
    }
    const desc = Array.from(detection.descriptor);
    if (desc.length !== 128) {
      throw new Error(`Invalid descriptor length ${desc.length}`);
    }
    return desc;
  }

  /**
   * Compare current frame against known attendees using multi-frame sampling + averaging.
   */
  static async recognizeFace(
    video: HTMLVideoElement,
    attendees: Attendee[]
  ): Promise<RecognitionResult> {
    try {
      // 1) Sample 3 descriptors, 0.5s apart
      const samples: number[][] = [];
      for (let i = 0; i < 3; i++) {
        const det = await this.detectFace(video);
        if (det) {
          const desc = Array.from(det.descriptor);
          if (desc.length === 128) {
            samples.push(desc);
          } else {
            console.warn(`Sample ${i} descriptor length ${desc.length}, skipping`);
          }
        }
        await new Promise(r => setTimeout(r, 500));
      }

      if (!samples.length) {
        return { isMatch: false, confidence: 0 };
      }

      // 2) Average descriptors
      const length = samples[0].length;
      const avg = new Array<number>(length).fill(0);
      samples.forEach(arr => arr.forEach((v, idx) => (avg[idx] += v)));
      for (let i = 0; i < length; i++) {
        avg[i] /= samples.length;
      }

      // 3) Validate averaged descriptor
      if (avg.length !== 128) {
        console.error(`Invalid averaged descriptor length ${avg.length}`);
        return { isMatch: false, confidence: 0 };
      }

      // 4) Find best match
      let bestMatch: Attendee | undefined;
      let bestDistance = Infinity;
      for (const attendee of attendees) {
        if (attendee.faceDescriptor.length !== avg.length) {
          console.warn(
            `Skipping ${attendee.name}: stored descriptor length ${attendee.faceDescriptor.length}`
          );
          continue;
        }
        const distance = euclideanDistance(avg, attendee.faceDescriptor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = attendee;
        }
      }

      // 5) Compute confidence & decide match
      const confidence = Math.max(0, 1 - bestDistance);
      const isMatch = confidence > this.SIMILARITY_THRESHOLD;
      return {
        attendee: isMatch ? bestMatch : undefined,
        confidence,
        isMatch,
      };
    } catch (error) {
      console.error('Face recognition error:', error);
      return { isMatch: false, confidence: 0 };
    }
  }

  /**
   * Draw detection results onto a canvas overlay.
   */
  static drawDetection(
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    detection: faceapi.WithFaceDescriptor<
      faceapi.WithFaceLandmarks<
        faceapi.WithFaceDetection<{}>,
        faceapi.FaceLandmarks68
      >
    > | null
  ) {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detection?.detection) {
        const { box } = detection.detection;
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        ctx.fillStyle = '#3B82F6';
        ctx.font = '16px Arial';
        ctx.fillText(
          `${(detection.detection.score * 100).toFixed(1)}%`,
          box.x,
          box.y - 10
        );

        detection.landmarks.positions.forEach(pt => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    } catch (error) {
      console.error('Error drawing detection:', error);
    }
  }
}
