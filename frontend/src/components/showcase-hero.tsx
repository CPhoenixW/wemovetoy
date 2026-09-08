"use client";

import { useEffect, useState } from "react";

/**
 * 公司展示图全宽背景轮换（淡入淡出）。
 * 自身只渲染绝对定位、铺满父容器（.catalog-hero）的图片层；
 * 文字内容由服务端页面叠在其上。images 为空时不渲染任何内容。
 */
export function ShowcaseHero({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div aria-hidden="true" className="catalog-hero__slides">
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          alt=""
          aria-hidden={i !== index}
          className={i === index ? "is-active" : undefined}
          src={src}
        />
      ))}
    </div>
  );
}
