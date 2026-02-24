"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useRegisteredVoters } from "@/hooks/use-registered-voters";

interface Props {
    electionPda: string;
}

export default function VoterManagementDashboard({ electionPda }: Props) {
    const { voters, voterCount, committedCount, revealedCount, loading, error } =
        useRegisteredVoters(electionPda);

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
                    <div className="space-y-2">
                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {voters.map((voter, idx) => (
                                <div
                                    key={voter.voterAddress}
                                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                                >
                                    <div className="flex-1 space-y-1">
                                        <p className="font-mono text-xs">
                                            <span className="text-muted-foreground">#{idx + 1}</span>{" "}
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
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
