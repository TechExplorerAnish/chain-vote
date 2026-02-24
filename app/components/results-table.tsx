"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CandidateAccount, ElectionAccount } from "@/lib/types";

interface Props {
    election: ElectionAccount;
    candidates: CandidateAccount[];
}

export default function ResultsTable({ election, candidates }: Props) {
    const totalVotes = candidates.reduce(
        (sum, c) => sum + Number(c.revealedVotes),
        0
    );

    const sorted = [...candidates].sort(
        (a, b) => Number(b.revealedVotes) - Number(a.revealedVotes)
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Election Results</span>
                    <Badge variant="outline">
                        {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">Rank</TableHead>
                            <TableHead>Candidate</TableHead>
                            <TableHead>Party</TableHead>
                            <TableHead className="text-right">Votes</TableHead>
                            <TableHead className="text-right">Share</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sorted.map((c, rank) => {
                            const votes = Number(c.revealedVotes);
                            const share = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : "0.0";
                            return (
                                <TableRow key={c.index}>
                                    <TableCell className="font-mono">{rank + 1}</TableCell>
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{c.party}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono">{votes}</TableCell>
                                    <TableCell className="text-right font-mono">{share}%</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                {election.finalTallyRootSet && (
                    <div className="mt-4 space-y-2 rounded-md border p-3 text-sm">
                        <div>
                            <span className="text-muted-foreground">Final Tally Root: </span>
                            <span className="font-mono text-xs break-all">
                                {election.finalTallyRoot
                                    .map((b) => b.toString(16).padStart(2, "0"))
                                    .join("")}
                            </span>
                        </div>
                        {election.proofUri && (
                            <div>
                                <span className="text-muted-foreground">Proof: </span>
                                <a
                                    href={election.proofUri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline underline-offset-4"
                                >
                                    {election.proofUri}
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
