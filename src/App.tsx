import { FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";
import {
  createResource,
  type Component,
  Suspense,
  Match,
  Switch,
  createEffect,
  onCleanup,
} from "solid-js";

async function getCameraStream() {
  console.count("#count #camera init");
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  return stream;
}

function useCamera() {
  const [mediaStream] = createResource(getCameraStream);

  onCleanup(() => {
    const stream = mediaStream();
    if (stream) {
      console.count("#count #camera close");
      stream.getTracks().forEach((track) => track.stop());
    }
  });

  return mediaStream;
}

async function initializeObjectDetector() {
  console.count("#count #detector init");
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm",
  );

  const objectDetector = await ObjectDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
      delegate: "GPU",
    },
    scoreThreshold: 0.6,
    maxResults: 5,
    runningMode: "VIDEO",
  });

  return objectDetector;
}

function useObjectDetector() {
  const [objectDetector] = createResource(initializeObjectDetector);

  onCleanup(() => {
    const detector = objectDetector();
    if (detector) {
      console.count("#count #detector close");
      detector.close();
    }
  });

  return objectDetector;
}

const App: Component = () => {
  const mediaStream = useCamera();
  const objectDetector = useObjectDetector();

  let video!: HTMLVideoElement;
  let wrapper!: HTMLDivElement;
  let lastVideoTime = -1;
  let animationFrameId: number;

  createEffect(() => {
    const stream = mediaStream();
    if (stream) {
      video.srcObject = stream;
    }
  });

  createEffect(() => {
    const videoReady =
      !!video && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA;

    if (!objectDetector() || !videoReady) {
      console.count("#count #frame bail");
      return;
    }

    const loop = (_currentFrameTimeMs: number) => {
      const detector = objectDetector();
      const videoReady =
        !!video && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA;
      if (!detector || !videoReady) {
        console.count("#count #frame end");
        return;
      }

      const startTimeMs = performance.now();

      if (video.currentTime === lastVideoTime) {
        console.count("#count #frame skip");
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      lastVideoTime = video.currentTime;
      const results = detector.detectForVideo(video, startTimeMs);
      wrapper.textContent = "";
      for (const detection of results.detections) {
        const category = detection.categories[0];
        if (!detection.boundingBox || !category) {
          continue;
        }

        // A `div` element for bounding box.
        const box = document.createElement("div");

        box.style.position = "absolute";
        box.style.border = "2px solid red";
        // Notice how we are using the calculated ratios to preserve
        // the sizing and coordinate of the detection.
        box.style.left = `${detection.boundingBox.originX}px`;
        box.style.top = `${detection.boundingBox.originY}px`;
        box.style.height = `${detection.boundingBox.height}px`;
        box.style.width = `${detection.boundingBox.width}px`;

        // Extract the name of the detection and score.
        const labelName = category.categoryName;
        const scorePercentage = Math.round(category.score * 100);
        // A `small` element for the label.
        const label = document.createElement("small");

        label.style.position = "absolute";
        label.style.top = "-16px";
        label.style.left = "0";
        label.style.color = "white";
        label.style.backgroundColor = "red";
        label.textContent = `${labelName} ${scorePercentage}%`;

        // Finally append the elements.
        box.append(label);
        wrapper.append(box);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    console.count("#count #frame init");
    animationFrameId = requestAnimationFrame(loop);

    onCleanup(() => {
      console.count("#count #frame close");
      cancelAnimationFrame(animationFrameId);
    });
  });

  return (
    <main>
      <Suspense fallback={<div>loading...</div>}>
        <Switch>
          <Match when={!!mediaStream.error}>
            <div>Failed to get camera stream</div>
          </Match>
          <Match when={!!mediaStream()}>
            <div class="h-screen w-screen border border-white">
              <video
                ref={video}
                autoplay
                muted
                controls={false}
                class="h-full w-full"
              />
              <div
                ref={wrapper}
                class="absolute bottom-0 left-0 right-0 top-0"
              />
            </div>
          </Match>
        </Switch>
      </Suspense>
    </main>
  );
};

export default App;
