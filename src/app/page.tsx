"use client";

import { useEffect, useRef, useState } from "react";
import { useVideoStream } from "~/lib/media";
import { useRecognizer } from "~/lib/recognizerStore";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-slate-900">
      <InnerHome />
    </main>
  );
}

function InnerHome() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const lastVideoTime = useRef(-1);
  const animationFrameId = useRef<number | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const recognizer = useRecognizer();
  const videoStreamQuery = useVideoStream();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (videoStreamQuery.data) {
      video.srcObject = videoStreamQuery.data.mediaStream;
    }

    const handle = () => {
      setIsVideoReady(
        (video.readyState ?? -1) >= HTMLMediaElement.HAVE_CURRENT_DATA,
      );
    };

    handle();

    const events: Array<keyof HTMLMediaElementEventMap> = [
      "loadeddata",
      "play",
      "canplay",
      "loadstart",
      "loadedmetadata",
      "loadeddata",
      "ended",
      "pause",
      "stalled",
      "suspend",
      "waiting",
      "abort",
    ];

    events.forEach((event) => video.addEventListener(event, handle));

    return () => {
      events.forEach((event) => video.removeEventListener(event, handle));
    };
  }, [videoStreamQuery.data]);

  useEffect(() => {
    if (!isVideoReady || !recognizer) {
      return;
    }

    const loop = (_currentFrameTimeMs: number) => {
      if (
        !recognizer ||
        !videoRef.current ||
        !wrapper.current ||
        videoRef.current.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA
      ) {
        console.count("#count #frame end");
        return;
      }

      const startTimeMs = performance.now();

      if (videoRef.current.currentTime === lastVideoTime.current) {
        console.count("#count #frame skip");
        animationFrameId.current = requestAnimationFrame(loop);
        return;
      }

      lastVideoTime.current = videoRef.current.currentTime;

      const results = recognizer.detectForVideo(videoRef.current, startTimeMs);
      wrapper.current.textContent = "";
      for (const detection of results.detections) {
        const category = detection.categories[0];
        if (!detection.boundingBox || !category) {
          continue;
        }

        // A `div` element for bounding box.
        const box = document.createElement("div");

        // video 640x480
        const widthRatio =
          videoRef.current.clientWidth / videoRef.current.videoWidth;
        const heightRatio =
          videoRef.current.clientHeight / videoRef.current.videoHeight;

        box.style.position = "absolute";
        box.style.border = "2px solid red";
        box.style.left = `${detection.boundingBox.originX * widthRatio}px`;
        box.style.top = `${detection.boundingBox.originY * heightRatio}px`;
        box.style.height = `${detection.boundingBox.height * heightRatio}px`;
        box.style.width = `${detection.boundingBox.width * widthRatio}px`;

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
        wrapper.current.append(box);
      }

      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameId.current) {
        console.count("#count #frame close");
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isVideoReady, recognizer]);

  if (!videoStreamQuery.data) {
    return (
      <div className="text-lg font-bold text-white">Loading Camera...</div>
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        muted
        controls={false}
        className="fixed bottom-0 left-0 right-0 top-0 h-screen w-screen object-cover"
        playsInline
      />
      <div
        ref={wrapper}
        className="fixed bottom-0 left-0 right-0 top-0 h-screen w-screen"
      />
    </>
  );
}
