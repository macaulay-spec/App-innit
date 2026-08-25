import { useEffect, useRef, useState } from "react";
import { decode } from "blurhash";
import type { ImageRef } from "../lib/types";
import { cn } from "../lib/cn";

/** Blur-up image: renders the blurHash on a canvas, crossfades to the real image. */
export function BlurImg({
  image,
  alt,
  className,
  imgClassName,
  eager = false,
}: {
  image?: ImageRef;
  alt: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image?.blurHash) return;
    try {
      const pixels = decode(image.blurHash, 32, 32);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = 32;
      canvas.height = 32;
      const imgData = ctx.createImageData(32, 32);
      imgData.data.set(pixels);
      ctx.putImageData(imgData, 0, 0);
    } catch {
      /* invalid hash — flat tint remains */
    }
  }, [image?.blurHash]);

  return (
    <div
      className={cn("relative overflow-hidden bg-canvas-raise", className)}
      style={image?.avgHueDark ? { backgroundColor: image.avgHueDark } : undefined}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 h-full w-full scale-105 blur-md transition-opacity duration-700"
        style={{ opacity: loaded && !failed ? 0 : 1 }}
      />
      {image?.url && !failed ? (
        <img
          src={image.url}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-all duration-700",
            loaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.03]",
            imgClassName,
          )}
        />
      ) : null}
    </div>
  );
}
