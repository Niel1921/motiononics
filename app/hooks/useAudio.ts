// hooks/useAudio.ts
import { useRef, useCallback } from "react";
import {
  SAMPLE_URLS,
  GUITAR_STRING_MAPPING,
} from "../../lib/constants";

export function useAudio() {
  const audioCtxRef  = useRef<AudioContext|null>(null);
  const samplesRef   = useRef<Record<string,AudioBuffer>>({});
  const convolverRef = useRef<ConvolverNode|null>(null);
  const playing      = useRef<Record<number,boolean>>({});

  const initAudio = useCallback(async ()=>{
    if (!audioCtxRef.current) {
         // TS: AudioContext exists, webkitAudioContext may not be typed
         const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
         audioCtxRef.current = new Ctor();
       }
    const ctx = audioCtxRef.current!;
    for (const [key,url] of Object.entries(SAMPLE_URLS)) {
      const r = await fetch(url);
      if (!r.ok) continue;
      const buf = await r.arrayBuffer();
      samplesRef.current[key] = await ctx.decodeAudioData(buf);
    }
    // optional reverb
    try {
      const r = await fetch("/samples/impulse.wav");
      if (r.ok) {
        const buf = await r.arrayBuffer();
        const conv = ctx.createConvolver();
        conv.buffer = await ctx.decodeAudioData(buf);
        convolverRef.current = conv;
      }
    } catch {}
  }, []);

  function playGuitarString(
    idx: number,
    bpm: number,
    noteLen: number
  ) {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const samples = samplesRef.current;
    if (!samples["None"]) return;

    // clamp idx into [0 .. GUITAR_STRING_MAPPING.length-1]
    const safeIdx = Math.min(
      Math.max(idx, 0),
      GUITAR_STRING_MAPPING.length - 1
    );
    const mapping = GUITAR_STRING_MAPPING[safeIdx];

    if (playing.current[safeIdx]) return;
    playing.current[safeIdx] = true;

    const src = ctx.createBufferSource();
    src.buffer = samples["None"];
    src.playbackRate.value =
      2 ** (mapping.semitoneOffset / 12);

    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    src.connect(gain);
    if (convolverRef.current) {
      gain.connect(convolverRef.current).connect(ctx.destination);
    } else {
      gain.connect(ctx.destination);
    }

    const dur = (60 / bpm) * noteLen;
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    src.start();
    src.stop(ctx.currentTime + dur + 0.1);

    setTimeout(
      () => (playing.current[safeIdx] = false),
      (dur + 0.1) * 1000
    );
  }

  return { initAudio, playGuitarString, audioCtxRef, samplesRef, convolverRef };
}
