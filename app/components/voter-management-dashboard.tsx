"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRegisteredVoters } from "@/hooks/use-registered-voters";
import { useEffect, useState } from "react";

interface Props {
    electionPda: string;
    refetchTrigger?: number;
}

const VOTERS_PER_PAGE = 10;

export default function VoterManagementDashboard({ electionPda, refetchTrigger }: Props) {
    const [internalTrigger, setInternalTrigger] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (refetchTrigger !== undefined) {
            setInternalTrigger(refetchTrigger);
        }
    }, [refetchTrigger]);

    const { voters, voterCount, committedCount, revealedCount, loading, error } =
        useRegisteredVoters(electionPda, internalTrigger);

    // Reset to page 1 when voters change
    useEffect(() => {
        setCurrentPage(1);
    }, [voterCount]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Registered Voters</CardTitle>
                    <CardDescription>Loading voter information...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Registered Voters</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const participationRate = voterCount > 0
        ? ((committedCount / voterCount) * 100).toFixed(1)
        : "0";

    const revealRate = committedCount > 0
        ? ((revealedCount / committedCount) * 100).toFixed(1)
        : "0";

    // Pagination calculations
    const totalPages = Math.ceil(voters.length / VOTERS_PER_PAGE);
    const startIndex = (currentPage - 1) * VOTERS_PER_PAGE;
    const endIndex = startIndex + VOTERS_PER_PAGE;
    const currentVoters = voters.slice(startIndex, endIndex);
    const showingStart = voters.length > 0 ? startIndex + 1 : 0;
    const showingEnd = Math.min(endIndex, voters.length);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registered Voters</CardTitle>
                <CardDescription>
                    {voterCount} {voterCount === 1 ? "voter" : "voters"} registered • {" "}
                    {committedCount} committed ({participationRate}%) • {" "}
                    {revealedCount} revealed ({revealRate}% of committed)
                </CardDescription>
            </CardHeader>
            <CardContent>
                {voters.length === 0 ? (
                    <Alert>
                        <AlertDescription>
                            No voters registered yet. Register voters during the Registration phase.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            {currentVoters.map((voter, idx) => {
                                const absoluteIndex = startIndex + idx;
                                return (
                                    <div
                                        key={voter.voterAddress}
                                        className="flex items-center justify-between rounded-lg border p-3 text-sm"
                                    >
                                        <div className="flex-1 space-y-1">
                                            <p className="font-mono text-xs">
                                                <span className="text-muted-foreground">#{absoluteIndex + 1}</span>{" "}
                                                {voter.voterAddress.slice(0, 8)}...
                                                {voter.voterAddress.slice(-8)}
                                            </p>
                                            {voter.hasCommitted && voter.committedAt && (
                                                <p className="text-xs text-muted-foreground">
                                                    Committed: {new Date(Number(voter.committedAt) * 1000).toLocaleString()}
                                                </p>
                                            )}
                                            {voter.hasRevealed && voter.revealedAt && (
                                                <p className="text-xs text-muted-foreground">
                                                    Revealed: {new Date(Number(voter.revealedAt) * 1000).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge
                                                variant={voter.isActive ? "default" : "secondary"}
                                            >
                                                {voter.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                            {voter.hasRevealed ? (
                                                <Badge variant="default" className="bg-green-600">
                                                    Revealed
                                                </Badge>
                                            ) : voter.hasCommitted ? (
                                                <Badge variant="default" className="bg-blue-600">
                                                    Committed
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">
                                                    Not Voted
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t pt-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {showingStart}-{showingEnd} of {voters.length}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <Button
                                                key={page}
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setCurrentPage(page)}
                                                className="min-w-10"
                                            >
                                                {page}
                                            </Button>
                                        ))}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
