import { FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";
import { useEffect } from "react";
import { create } from "zustand";

type RecognizerStore = {
  loading: boolean;
  recognizer: ObjectDetector | undefined;
};

const useRecognizerStore = create<RecognizerStore>(() => ({
  loading: false,
  recognizer: undefined,
}));

export function useRecognizer() {
  const recognizer = useRecognizerStore((s) => s.recognizer);

  useEffect(() => {
    void initializeObjectDetector();
  }, []);

  return recognizer;
}


async function initializeObjectDetector() {
  const state = useRecognizerStore.getState();
  if (state.loading || !!state.recognizer) {
    console.count("#count #detector bail init");
    return;
  }

  useRecognizerStore.setState({ loading: true });

  console.count("#count #detector init");
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
  );

  const objectDetector = await ObjectDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite`,
      delegate: "CPU",
    },
    scoreThreshold: 0.4,
    maxResults: 5,
    runningMode: "VIDEO",
  });

  useRecognizerStore.setState({
    loading: false,
    recognizer: objectDetector,
  });
}
