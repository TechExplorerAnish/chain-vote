"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");

  const handleLookup = () => {
    if (adminKey.trim()) {
      router.push(`/election/${adminKey.trim()}`);
    }
  };

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Chain Vote",
    description:
      "Secure blockchain-based governance voting protocol with commit-reveal privacy on Solana",
    applicationCategory: "GovernmentApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Commit-Reveal Voting",
      "Multisig Governance",
      "Deterministic PDAs",
      "On-Chain Audit Trail",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="mx-auto max-w-4xl space-y-8 p-6">
        {/* Hero */}
        <section className="space-y-4 pt-8 text-center">
          <Badge variant="secondary">Solana · Anchor · Commit-Reveal</Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Chain Vote Governance Protocol
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            A blockchain voting protocol with deterministic PDAs, commit-reveal
            privacy, multisig governance, and transparent on-chain audit trails.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/admin">
              <Button>Admin Panel</Button>
            </Link>
            <Link href="/documentation">
              <Button variant="outline">Documentation</Button>
            </Link>
          </div>
        </section>

        <Separator />

        {/* Election Lookup */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>View Election</CardTitle>
              <CardDescription>
                Enter the admin public key that initialized the election to view its
                live status, candidates, and results.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="election-key">Admin Public Key</Label>
                <Input
                  id="election-key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="e.g. 9JHuSg8vw8…"
                  className="font-mono text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                />
              </div>
              <Button onClick={handleLookup} disabled={!adminKey.trim()}>
                View Election
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Features */}
        <section className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Commit-Reveal Voting</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Votes are committed as SHA-256 hashes with nonce and salt. Revealed
              only after the voting window closes, ensuring ballot privacy.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Multisig Governance</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Admin actions require governance proposals with threshold-based
              approval. Replay-safe with nonce and expiry validation.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deterministic PDAs</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Election, candidate, voter, and whitelist accounts are derived from
              deterministic seeds — no off-chain state needed.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">On-Chain Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Every action emits Anchor events. Final tally root and proof URI
              committed on-chain for transparent verifiability.
            </CardContent>
          </Card>
        </section>

        {/* Lifecycle */}
        <Card>
          <CardHeader>
            <CardTitle>Election Lifecycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {[
                "Created",
                "Registration",
                "Voting",
                "Reveal",
                "Finalized",
              ].map((phase, i) => (
                <span key={phase} className="flex items-center gap-2">
                  <Badge variant={i === 0 ? "default" : "outline"}>{phase}</Badge>
                  {i < 4 && <span className="text-muted-foreground">→</span>}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Forward-only phase transitions enforced on-chain. Each transition
              requires an executed governance proposal. Finalization requires
              tally root commitment and complete vote reveals.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
