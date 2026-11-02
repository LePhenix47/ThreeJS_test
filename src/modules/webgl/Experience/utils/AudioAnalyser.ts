import * as THREE from "three";
import { Destroyable } from "@utils/types/lifecycle.type";

export type AudioAnalyserConstructor = {
  camera: THREE.Camera;
  /** How many raw waveform samples get pulled per analysis window, must be a power of 2. Half this many frequency bins come out of getFrequencyData(). */
  fftSize?: number;
};

const DEFAULT_FFT_SIZE: number = 2 ** 7;

class AudioAnalyser implements Destroyable {
  /** Owns the `AudioContext` and the one volume-control node all sound funnels through to reach the speakers. Required by THREE.Audio even without positional/3D sound. */
  private readonly listener: THREE.AudioListener;
  /** The audio source, wired into the listener's output. */
  private readonly sound: THREE.Audio;
  /** How many raw waveform samples get pulled per analysis window, driving `getFrequencyData()`'s resolution (half this many bins come out). Must stay fixed after construction, three.js has no API to resize an existing analyser. */
  private readonly fftSize: number;

  /** The actual analyser, tapping `sound`'s output. Null until a media element is connected. */
  private instance: THREE.AudioAnalyser | null = null;
  /** Set once by `setMediaElement()`. A media element can only ever back one MediaElementAudioSourceNode. */
  private mediaElement: HTMLMediaElement | null = null;

  constructor({
    camera,
    fftSize = DEFAULT_FFT_SIZE,
  }: AudioAnalyserConstructor) {
    this.fftSize = fftSize;

    const listener = new THREE.AudioListener();
    camera.add(listener);
    this.listener = listener;

    this.sound = new THREE.Audio(listener);
  }

  /** Wires `audio` as the analysed source. No-ops after the first call. */
  public setMediaElement(audio: HTMLMediaElement): void {
    if (this.mediaElement) return;

    this.mediaElement = audio;
    this.sound.setMediaElementSource(audio);
    this.instance = new THREE.AudioAnalyser(this.sound, this.fftSize);
  }

  /** Frequency bins (0-255 each), low to high. Empty until a media element is connected. */
  public getFrequencyData(): Uint8Array {
    if (!this.instance) return new Uint8Array(0);

    return this.instance.getFrequencyData();
  }

  /** Overall loudness (0-255), averaged across the whole spectrum. 0 until a media element is connected. */
  public getVolume(): number {
    if (!this.instance) return 0;

    return this.instance.getAverageFrequency();
  }

  public destroy(): void {
    this.sound.disconnect();
    this.listener.parent?.remove(this.listener);
  }
}

export default AudioAnalyser;
