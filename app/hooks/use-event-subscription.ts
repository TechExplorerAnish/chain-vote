"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getConnection } from "@/lib/program";
import { PROGRAM_ID } from "@/lib/constants";

interface LogEvent {
    signature: string;
    logs: string[];
    timestamp: number;
}

/**
 * Subscribe to program log events and trigger callbacks.
 * Parses Anchor event names from log lines.
 */
export function useEventSubscription(
    eventNames: string[],
    onEvent: (eventName: string, event: LogEvent) => void,
    enabled = true
) {
    const subIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const connection = getConnection();

        subIdRef.current = connection.onLogs(
            PROGRAM_ID,
            (logInfo) => {
                const { signature, logs } = logInfo;
                const logEvent: LogEvent = {
                    signature,
                    logs,
                    timestamp: Date.now(),
                };

                for (const name of eventNames) {
                    // Anchor emits: "Program log: <EventName>"
                    const hasEvent = logs.some(
                        (line) =>
                            line.includes(`Program data:`) ||
                            line.includes(name)
                    );
                    if (hasEvent) {
                        onEvent(name, logEvent);
                    }
                }
            },
            "confirmed"
        );

        return () => {
            if (subIdRef.current !== null) {
                connection.removeOnLogsListener(subIdRef.current);
            }
        };
    }, [eventNames, onEvent, enabled]);
}

/**
 * Convenience hook for election-related events.
 * Returns a reactive list of recent event logs.
 */
export function useElectionEvents(enabled = true) {
    const [events, setEvents] = useState<LogEvent[]>([]);

    const handleEvent = useCallback((_name: string, event: LogEvent) => {
        setEvents((prev) => [event, ...prev].slice(0, 50));
    }, []);

    useEventSubscription(
        [
            "VoteCommitted",
            "VoteRevealed",
            "ElectionPhaseTransitioned",
            "ResultsPublished",
            "FinalTallyRootCommitted",
            "CandidateRegistered",
            "VoterRegistered",
        ],
        handleEvent,
        enabled
    );

    return events;
}
