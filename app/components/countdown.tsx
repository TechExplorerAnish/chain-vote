"use client";

import { useEffect, useState } from "react";

interface Props {
    targetTime: bigint;
    label: string;
}

export default function Countdown({ targetTime, label }: Props) {
    const [remaining, setRemaining] = useState("");
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        const update = () => {
            const now = Math.floor(Date.now() / 1000);
            const diff = Number(targetTime) - now;

            if (diff <= 0) {
                setRemaining("00:00:00");
                setExpired(true);
                return;
            }

            const hours = Math.floor(diff / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            const seconds = diff % 60;

            setRemaining(
                `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
            );
            setExpired(false);
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [targetTime]);

    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{label}:</span>
            <span className={`font-mono ${expired ? "text-destructive" : ""}`}>
                {remaining}
            </span>
        </div>
    );
}
