import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function DocumentationPage() {
    return (
        <div className="mx-auto max-w-5xl space-y-8 p-6">
            <section className="space-y-4 pt-6">
                <Badge variant="secondary">Documentation</Badge>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Chain Vote Protocol Guide
                </h1>
                <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                    End-to-end reference for admins and voters: governance proposal flow,
                    election lifecycle, commit-reveal voting, tally publication, and common troubleshooting.
                </p>
                <div className="flex gap-3">
                    <Link href="/admin">
                        <Button>Open Admin Panel</Button>
                    </Link>
                    <Link href="/">
                        <Button variant="outline">Back to Home</Button>
                    </Link>
                </div>
            </section>

            <Separator />

            <section className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Core Model</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Governance actions are proposal-driven and action-hash protected. Election state moves forward only:
                        Created → Registration → Voting → Reveal → Finalized.
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Security Primitives</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Commit-reveal voting with nonce+salt preimage, deterministic PDAs, nonce-based replay protection,
                        proposal expiry, and on-chain final tally root commitment.
                    </CardContent>
                </Card>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle>Admin Flow (Required Order)</CardTitle>
                    <CardDescription>Use the same proposal nonce during create/approve/execute/consume steps.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p>1. Initialize multisig (admin set + threshold).</p>
                    <p>2. Create InitializeElection proposal with future start/end.</p>
                    <p>3. Approve and execute that proposal.</p>
                    <p>4. Initialize election in Election tab using the executed proposal nonce.</p>
                    <p>5. Transition to Registration, add candidates, register voters.</p>
                    <p>6. Transition to Voting, voters commit votes.</p>
                    <p>7. Transition to Reveal, voters reveal preimages.</p>
                    <p>8. Create + approve + execute PublishTallyRoot proposal using exact tallyRoot/proofUri inputs.</p>
                    <p>9. Publish tally root, then transition to Finalized.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Voter Flow</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>• Voter must be whitelisted during Registration.</p>
                    <p>• During Voting: choose candidate and commit hash.</p>
                    <p>• During Reveal: reveal candidate + secret preimage used in commit.</p>
                    <p>• Commit and reveal are one-time operations; duplicates are rejected on-chain.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Troubleshooting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>StartTimeInPast</strong>: create a new InitializeElection proposal with start time safely in the future.</p>
                    <p><strong>InvalidActionHash</strong>: proposal payload does not match execution payload (phase/tally/proof mismatch).</p>
                    <p><strong>MissingFinalTallyRoot</strong>: publish tally root before transitioning to Finalized.</p>
                    <p><strong>0 voters shown</strong>: ensure election PDA and whitelist filters are correct; refresh after registration.</p>
                    <p><strong>Clock drift</strong>: reset local validator and redeploy when localnet time gets inconsistent.</p>
                </CardContent>
            </Card>
        </div>
    );
}
