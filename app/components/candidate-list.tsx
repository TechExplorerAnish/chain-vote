"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { CandidateAccount } from "@/lib/types";

interface Props {
    candidates: CandidateAccount[];
}

export default function CandidateList({ candidates }: Props) {
    if (candidates.length === 0) {
        return (
            <p className="py-6 text-center text-sm text-muted-foreground">
                No candidates registered yet.
            </p>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead className="text-right">Committed</TableHead>
                    <TableHead className="text-right">Revealed</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {candidates.map((c) => (
                    <TableRow key={c.index}>
                        <TableCell className="font-mono">{c.index}</TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                            <Badge variant="secondary">{c.party}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {c.encryptedVotes.toString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {c.revealedVotes.toString()}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
