// hooks/useGesture.ts
import { useState, useEffect, useCallback } from "react";
import {
  FilesetResolver,
  GestureRecognizer
} from "@mediapipe/tasks-vision";

export function useGesture() {
  const [recognizer, setRecognizer] = useState<GestureRecognizer|null>(null);

  const init = useCallback(async ()=>{
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.1/wasm"
    );
    const r = await GestureRecognizer.createFromOptions(vision,{
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task"
      },
      numHands:2,
      runningMode:"VIDEO"
    });
    setRecognizer(r);
  },[]);

  useEffect(()=>{
    init();
    return ()=>recognizer?.close();
  },[init]);

  return recognizer;
}
