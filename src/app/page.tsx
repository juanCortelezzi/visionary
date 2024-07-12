"use client";

import { useEffect, useRef } from "react";
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
  const video = useRef<HTMLVideoElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const lastVideoTime = useRef(-1);
  const animationFrameId = useRef<number | null>(null);

  const recognizer = useRecognizer();
  const videoStreamQuery = useVideoStream();

  useEffect(() => {
    if (video.current && videoStreamQuery.data) {
      video.current.srcObject = videoStreamQuery.data.mediaStream;
    }
  }, [videoStreamQuery.data]);

  useEffect(() => {
    if (
      !recognizer ||
      !video.current ||
      !wrapper.current ||
      video.current.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA
    ) {
      console.count("#count #frame bail");
      return;
    }

    const loop = (_currentFrameTimeMs: number) => {
      if (
        !recognizer ||
        !video.current ||
        !wrapper.current ||
        video.current.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA
      ) {
        console.count("#count #frame end");
        return;
      }

      const startTimeMs = performance.now();

      if (video.current.currentTime === lastVideoTime.current) {
        console.count("#count #frame skip");
        animationFrameId.current = requestAnimationFrame(loop);
        return;
      }

      lastVideoTime.current = video.current.currentTime;

      const results = recognizer.detectForVideo(video.current, startTimeMs);
      wrapper.current.textContent = "";
      for (const detection of results.detections) {
        const category = detection.categories[0];
        if (!detection.boundingBox || !category) {
          continue;
        }

        // A `div` element for bounding box.
        const box = document.createElement("div");

        // video 640x480
        const widthRatio = video.current.clientWidth / video.current.videoWidth;
        const heightRatio =
          video.current.clientHeight / video.current.videoHeight;

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

    console.count("#count #frame init");
    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameId.current) {
        console.count("#count #frame close");
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [recognizer]);

  if (!videoStreamQuery.data) {
    return <div>Loading Camera...</div>;
  }

  return (
    <>
      <video
        ref={video}
        autoPlay
        muted
        controls={false}
        className="fixed bottom-0 left-0 right-0 top-0 h-screen w-screen object-cover"
      />
      <div
        ref={wrapper}
        className="fixed bottom-0 left-0 right-0 top-0 h-screen w-screen"
      />
    </>
  );
}
