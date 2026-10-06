// Audio stays ephemeral on the device. Only an explicit check uploads it.
export class LearnerAudioBuffer {
  private recorder: MediaRecorder | null = null;
  private clone: MediaStreamTrack | null = null;
  private deadline: ReturnType<typeof setTimeout> | undefined;
  private finished: Promise<Blob | null> | null = null;
  private last: { blob: Blob; at: number } | null = null;
  constructor(private source: () => MediaStreamTrack | undefined) {}
  start() {
    if (this.recorder || typeof MediaRecorder === "undefined") return false;
    const source = this.source();
    if (!source || source.readyState !== "live") return false;
    this.clone = source.clone();
    this.clone.enabled = true;
    const mimeType = [
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(
      new MediaStream([this.clone]),
      mimeType ? { mimeType } : {},
    );
    this.recorder = recorder;
    const chunks: Blob[] = [];
    this.finished = new Promise((resolve) => {
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => {
        clearTimeout(this.deadline);
        const blob = new Blob(chunks, { type: recorder.mimeType });
        this.clone?.stop();
        this.clone = null;
        this.recorder = null;
        if (blob.size) this.last = { blob, at: Date.now() };
        resolve(blob.size ? blob : null);
      };
      recorder.onerror = () => {
        this.clone?.stop();
        this.recorder = null;
        resolve(null);
      };
    });
    recorder.start();
    this.deadline = setTimeout(() => this.stop(), 20000);
    return true;
  }
  stop() {
    if (this.recorder?.state === "recording") this.recorder.stop();
  }
  async latest() {
    this.stop();
    if (this.finished) await this.finished;
    return this.last && Date.now() - this.last.at < 60000
      ? this.last.blob
      : null;
  }
  async practice() {
    this.stop();
    if (this.finished) await this.finished;
    if (!this.start())
      throw new Error("Allow a microphone to try the phrase privately.");
    await new Promise((resolve) => setTimeout(resolve, 6500));
    this.stop();
    return await this.finished;
  }
  dispose() {
    this.stop();
    clearTimeout(this.deadline);
    this.clone?.stop();
    this.last = null;
  }
}
