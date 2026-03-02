"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useRegisteredVoters } from "@/hooks/use-registered-voters";
import { VoterConfirmationDialog } from "./voter-confirmation-dialog";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
    Trash2,
    Users,
    History,
    CheckCircle2,
    AlertCircle,
    BarChart3,
    Clock
} from "lucide-react";

interface Props {
    electionPda: string;
    refetchTrigger?: number;
    adminKey?: string;
}

interface AuditLogEntry {
    address: string;
    action: string;
    timestamp: number;
    admin: string;
}

const VOTERS_PER_PAGE = 10;

export default function VoterManagementDashboard({ electionPda, refetchTrigger, adminKey }: Props) {
    const [internalTrigger, setInternalTrigger] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [invalidVoters, setInvalidVoters] = useState<Set<string>>(new Set());
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
    const [showRemovalConfirm, setShowRemovalConfirm] = useState(false);
    const [voterToRemove, setVoterToRemove] = useState<string | null>(null);

    useEffect(() => {
        if (refetchTrigger !== undefined) {
            setInternalTrigger(refetchTrigger);
        }
    }, [refetchTrigger]);

    // Load audit log from localStorage
    useEffect(() => {
        if (adminKey) {
            const saved = localStorage.getItem(`audit_log_${adminKey}`);
            if (saved) {
                try {
                    setAuditLog(JSON.parse(saved));
                } catch (err) {
                    console.error("Failed to parse audit log:", err);
                }
            }
            const invalidSaved = localStorage.getItem(`invalid_voters_${adminKey}`);
            if (invalidSaved) {
                try {
                    setInvalidVoters(new Set(JSON.parse(invalidSaved)));
                } catch (err) {
                    console.error("Failed to parse invalid voters:", err);
                }
            }
        }
    }, [adminKey]);

    const handleRemoveVoter = (voterAddress: string) => {
        setVoterToRemove(voterAddress);
        setShowRemovalConfirm(true);
    };

    const handleConfirmRemoval = () => {
        if (!voterToRemove || !adminKey) return;

        const newInvalidVoters = new Set(invalidVoters);
        newInvalidVoters.add(voterToRemove);
        setInvalidVoters(newInvalidVoters);
        localStorage.setItem(
            `invalid_voters_${adminKey}`,
            JSON.stringify(Array.from(newInvalidVoters))
        );

        const auditEntry: AuditLogEntry = {
            address: voterToRemove,
            action: "marked_invalid",
            timestamp: Math.floor(Date.now() / 1000),
            admin: adminKey,
        };
        const newLog = [...auditLog, auditEntry];
        setAuditLog(newLog);
        localStorage.setItem(`audit_log_${adminKey}`, JSON.stringify(newLog));

        toast.success("Voter marked as invalid", {
            description: `${voterToRemove.slice(0, 8)}... is no longer counted.`,
        });

        setShowRemovalConfirm(false);
        setVoterToRemove(null);
    };

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

    // Filter out invalid voters for display
    const validVoters = voters.filter(v => !invalidVoters.has(v.voterAddress));

    const totalPages = Math.ceil(validVoters.length / VOTERS_PER_PAGE);
    const startIndex = (currentPage - 1) * VOTERS_PER_PAGE;
    const endIndex = startIndex + VOTERS_PER_PAGE;
    const currentVoters = validVoters.slice(startIndex, endIndex);
    const showingStart = validVoters.length > 0 ? startIndex + 1 : 0;
    const showingEnd = Math.min(endIndex, validVoters.length);

    const formatDateTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Registered Voters
                </CardTitle>
                <CardDescription>
                    {voterCount} total • {validVoters.length} valid • {invalidVoters.size} invalid • {committedCount} committed ({participationRate}%) • {revealedCount} revealed ({revealRate}% of committed)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-sm font-semibold">{voterCount}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Valid</p>
                            <p className="text-sm font-semibold">{validVoters.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Invalid</p>
                            <p className="text-sm font-semibold">{invalidVoters.size}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Committed</p>
                            <p className="text-sm font-semibold">{committedCount}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Revealed</p>
                            <p className="text-sm font-semibold">{revealedCount}</p>
                        </div>
                    </div>
                </div>

                <Separator />

                <Tabs defaultValue="voters" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="voters" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Voters ({validVoters.length})
                        </TabsTrigger>
                        <TabsTrigger value="audit" className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Audit Log ({auditLog.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="voters" className="mt-4 space-y-4">
                        {validVoters.length === 0 ? (
                            <Alert>
                                <AlertDescription>
                                    {voterCount === 0
                                        ? "No voters registered yet. Register voters during the Registration phase."
                                        : "All registered voters have been marked as invalid."}
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <>
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
                                                <div className="flex items-center gap-2">
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
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveVoter(voter.voterAddress)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        title="Mark voter as invalid (before voting phase)"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between border-t pt-4">
                                        <div className="text-sm text-muted-foreground">
                                            Showing {showingStart}-{showingEnd} of {validVoters.length}
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
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="audit" className="mt-4 space-y-4">
                        {auditLog.length === 0 ? (
                            <Alert>
                                <AlertDescription>
                                    No audit log entries yet. Voter registration and removal actions will appear here.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="space-y-2">
                                {[...auditLog].reverse().map((entry, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-lg border p-3 text-sm space-y-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="font-mono text-xs">
                                                {entry.address.slice(0, 8)}...{entry.address.slice(-8)}
                                            </p>
                                            <Badge
                                                variant={entry.action === "marked_invalid" ? "destructive" : "default"}
                                            >
                                                {entry.action === "marked_invalid" ? "Removed" : "Registered"}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatDateTime(entry.timestamp)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            By: {entry.admin.slice(0, 8)}...{entry.admin.slice(-8)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <VoterConfirmationDialog
                    open={showRemovalConfirm}
                    onCancel={() => setShowRemovalConfirm(false)}
                    voterAddress={voterToRemove || ""}
                    type="remove"
                    onConfirm={handleConfirmRemoval}
                />
            </CardContent>
        </Card>
    );
}
