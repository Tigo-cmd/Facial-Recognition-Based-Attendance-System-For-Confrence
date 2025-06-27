// faceService.ts
import * as faceapi from 'face-api.js';
import { Attendee, RecognitionResult } from '../types';

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
      // assume video has been signaled ready externally
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('detectFace: video not ready enough, readyState:', video.readyState);
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
   * Extract a face descriptor; waits briefly for a frame if needed, then throws if still no face.
   */
  static async extractFaceDescriptor(video: HTMLVideoElement): Promise<Float32Array> {
    console.log('Attempting to extract face descriptor...');
    console.log('Before wait: readyState=', video.readyState, 'dimensions=', video.videoWidth, 'x', video.videoHeight);
    // Wait up to 2s for a frame
    await this.waitForVideoFrame(video, 2000);
    console.log('After wait: readyState=', video.readyState, 'dimensions=', video.videoWidth, 'x', video.videoHeight);

    const detection = await this.detectFace(video);
    if (!detection) {
      throw new Error('No face detected. Please ensure your face is clearly visible and well-lit.');
    }
    console.log('Face detected, descriptor length:', detection.descriptor.length);
    return detection.descriptor;
  }

  /**
   * Compare current frame against known attendees.
   */
  static async recognizeFace(video: HTMLVideoElement, attendees: Attendee[]): Promise<RecognitionResult> {
    try {
      const detection = await this.detectFace(video);
      if (!detection) {
        return { isMatch: false, confidence: 0 };
      }
      let bestMatch: Attendee | undefined;
      let bestDistance = Infinity;
      for (const attendee of attendees) {
        const distance = faceapi.euclideanDistance(detection.descriptor, attendee.faceDescriptor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = attendee;
        }
      }
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

      if (detection && detection.detection) {
        const box = detection.detection.box;
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        ctx.fillStyle = '#3B82F6';
        ctx.font = '16px Arial';
        ctx.fillText(`${(detection.detection.score * 100).toFixed(1)}%`, box.x, box.y - 10);

        if (detection.landmarks) {
          ctx.fillStyle = '#3B82F6';
          detection.landmarks.positions.forEach((pt) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
            ctx.fill();
          });
        }
      }
    } catch (error) {
      console.error('Error drawing detection:', error);
    }
  }
}
