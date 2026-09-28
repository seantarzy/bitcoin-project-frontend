import type { Metadata } from "next";
import LiveGame from "./LiveGame";
import { challengeScore } from "@/services/gameChart";
type Props = { searchParams: { beat?: string } };
export function generateMetadata({ searchParams }: Props): Metadata {
  const score = challengeScore(searchParams.beat);
  const title =
    score === null
      ? "Catch the next move · Live Bitcoin game"
      : `Can you beat ${score} Bitcoin ${score === 1 ? "call" : "calls"} in a row?`;
  const description =
    "Up or Down? Call Bitcoin’s next move. Play free and challenge a friend.";
  const images = [
    {
      url: `/play/card?score=${score ?? 0}`,
      width: 1200,
      height: 630,
      alt: title,
    },
  ];
  return {
    title,
    description,
    alternates: { canonical: "/play" },
    openGraph: {
      title,
      description,
      url: "https://whatsbitcoinsprice.com/play",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}
export default function PlayPage({ searchParams }: Props) {
  return <LiveGame challengeTarget={challengeScore(searchParams.beat)} />;
}
