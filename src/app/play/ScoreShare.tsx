"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { track } from "@/services/analytics";
export default function ScoreShare({
  score,
  onClose,
}: {
  score: number;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [asset, setAsset] = useState<{ url: string; file: File } | null>(null),
    [message, setMessage] = useState("");
  const link = `https://whatsbitcoinsprice.com/play?beat=${score}&utm_source=player&utm_medium=share&utm_campaign=next_move_game`;
  const text = `Catch the next move\n${"🟩".repeat(Math.min(score, 12))}${score > 12 ? ` +${score - 12}` : ""}\n${score} Bitcoin ${score === 1 ? "call" : "calls"} in a row. Can you beat my streak?`;
  useEffect(() => {
    dialog.current?.showModal();
    let stopped = false,
      url = "";
    const controller = new AbortController();
    fetch(`/play/card?score=${score}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.blob();
      })
      .then((blob) => {
        if (stopped) return;
        url = URL.createObjectURL(blob);
        setAsset({
          url,
          file: new File([blob], `bitcoin-streak-${score}.png`, {
            type: "image/png",
          }),
        });
      })
      .catch(() => {
        if (!stopped)
          setMessage(
            "Card unavailable. You can still copy your challenge link.",
          );
      });
    return () => {
      stopped = true;
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [score]);
  async function nativeShare() {
    try {
      if (asset && navigator.canShare?.({ files: [asset.file] }))
        await navigator.share({
          files: [asset.file],
          title: "Beat my Bitcoin streak",
          text,
          url: link,
        });
      else
        await navigator.share({
          title: "Beat my Bitcoin streak",
          text,
          url: link,
        });
      track("game_share", { method: "native" });
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        setMessage(
          "Sharing is unavailable here. Download the card or copy the challenge.",
        );
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text}\n${link}`);
      setMessage("Challenge copied. Send it to a friend.");
      track("game_share", { method: "copy" });
    } catch {
      setMessage("Copy the challenge link from the field below.");
    }
  }
  return (
    <dialog
      ref={dialog}
      className="score-dialog"
      onCancel={onClose}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="score-dialog-head">
        <div>
          <span className="game-kicker">CHALLENGE ACCEPTED?</span>
          <h2>Your streak. Their next challenge.</h2>
        </div>
        <button
          className="score-close"
          onClick={onClose}
          aria-label="Close score card"
        >
          ×
        </button>
      </div>
      {asset ? (
        <Image
          src={asset.url}
          width={1200}
          height={630}
          unoptimized
          alt={`${score} Bitcoin ${score === 1 ? "call" : "calls"} called correctly. Can you beat it?`}
          className="score-image"
        />
      ) : (
        <div className="score-loading" role="status">
          Making your score card…
        </div>
      )}
      <div className="score-actions">
        {typeof navigator !== "undefined" &&
          typeof navigator.share === "function" && (
            <button className="game-primary" onClick={nativeShare}>
              Share challenge
            </button>
          )}
        {asset && (
          <a
            className="score-secondary"
            href={asset.url}
            download={`bitcoin-streak-${score}.png`}
            onClick={() => track("game_share", { method: "download" })}
          >
            Save image
          </a>
        )}
        <button className="score-secondary" onClick={copy}>
          Copy challenge
        </button>
      </div>
      <label className="score-link">
        Challenge link
        <input readOnly value={link} onFocus={(e) => e.target.select()} />
      </label>
      <p role="status" className="game-footnote">
        {message || "Your friend opens the game with your streak to beat."}
      </p>
    </dialog>
  );
}
