import * as THREE from "three";
import { Destroyable } from "@utils/types/lifecycle.type";

export type WebcamConstructor = {
  /** Video element the stream plays into. Belongs to whoever created it, `destroy()` never removes it. */
  video: HTMLVideoElement;
};

class Webcam implements Destroyable {
  /** Texture that samples the live video frames. Refreshes itself, no `needsUpdate` needed. */
  public readonly texture: THREE.VideoTexture;

  private readonly video: HTMLVideoElement;
  private stream: MediaStream | null = null;

  /** Video frame width / height. 1 (square) until the stream's metadata loads. */
  public get aspectRatio(): number {
    const { videoWidth, videoHeight } = this.video;
    if (!videoWidth || !videoHeight) return 1;

    return videoWidth / videoHeight;
  }

  constructor({ video }: WebcamConstructor) {
    this.video = video;
    this.configureVideo();

    this.texture = new THREE.VideoTexture(video);
  }

  private configureVideo(): void {
    // ? Browsers only autoplay muted videos, and iOS Safari also needs playsInline to not open it fullscreen
    this.video.muted = true;
    this.video.playsInline = true;
  }

  /** Plays the stream in the video element, stopping the previous one. */
  public async setStream(stream: MediaStream): Promise<void> {
    this.stopStream();

    this.stream = stream;
    this.video.srcObject = stream;

    await this.video.play();
  }

  private stopStream(): void {
    const tracks: MediaStreamTrack[] = this.stream?.getTracks() ?? [];

    for (const track of tracks) {
      track.stop();
    }

    this.stream = null;
  }

  public destroy(): void {
    this.stopStream();

    // ? Detaches the stream from the element so the camera light goes off, the element itself stays in the DOM
    this.video.srcObject = null;

    this.texture.dispose();
  }
}

export default Webcam;
