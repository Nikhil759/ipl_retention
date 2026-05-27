import { getImageProps } from "next/image";

export const CARD_IMAGE_SIZES = "340px";
export const CARD_IMAGE_QUALITY = 75;
export const THUMB_IMAGE_SIZES = "40px";

export function preloadPlayerImage(
  imageUrl: string,
  sizes: string = CARD_IMAGE_SIZES
): void {
  if (typeof window === "undefined") return;

  const { props } = getImageProps({
    alt: "",
    src: imageUrl,
    sizes,
    quality: CARD_IMAGE_QUALITY,
    width: 680,
    height: 560,
  });

  const img = new window.Image();
  if (props.srcSet) {
    img.srcset = props.srcSet;
  }
  img.src = props.src;
}
