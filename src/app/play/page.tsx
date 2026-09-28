import type { Metadata } from "next";
import LiveGame from "./LiveGame";
export const metadata: Metadata = {
  title: "Catch the next move · Live Bitcoin game",
  openGraph: {
    title: "Catch Bitcoin’s next move",
    description: "Ten seconds. One target. Play free and challenge a friend.",
    url: "https://whatsbitcoinsprice.com/play",
  },
  description:
    "Ten seconds. One target. Predict Bitcoin’s next move, build your streak, and play free. No wallet needed.",
};
export default function PlayPage() {
  return <LiveGame />;
}
