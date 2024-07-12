import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const VIDEO_MIME_TYPE = "video/webm";

export function useVideoStream() {
  const queryClient = useQueryClient();

  const videoStreamQuery = useQuery({
    queryKey: ["videoStream"],
    queryFn: async ({ signal }) => {
      console.count("#count #stream request");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 1280,
          height: 720,
        },
      });

      signal.addEventListener("abort", () => {
        console.count("#count #stream cleanup");
        mediaStream.getTracks().forEach((track) => track.stop());
      });

      return { mediaStream } as const;
    },
    refetchOnMount: true,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 0,
    notifyOnChangeProps: ["data"],
  });

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["mediaDevices"] });

    return () => {
      console.count("#count #stream cleanup");
      videoStreamQuery.data?.mediaStream
        .getTracks()
        .forEach((track) => track.stop());
    };
  }, [queryClient, videoStreamQuery.data]);

  return videoStreamQuery;
}
