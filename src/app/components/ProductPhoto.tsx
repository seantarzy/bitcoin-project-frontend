"use client";
import Image from "next/image";
import { useState } from "react";
export default function ProductPhoto({
  src,
  alt,
  priority = false,
}: {
  src?: string;
  alt: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  const safe = src?.startsWith("https://cdn.shopify.com/s/files/1/1365/2497/");
  return safe && src !== failed ? (
    <Image
      src={src!}
      alt={alt}
      fill
      sizes="(max-width: 760px) 90vw, 500px"
      priority={priority}
      onError={() => setFailed(src)}
      className="product-photo"
    />
  ) : (
    <span className="product-photo-missing">
      Photo unavailable<span>The real find is still worth a look ↗</span>
    </span>
  );
}
