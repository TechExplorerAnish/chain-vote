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
import {
  Search,
  ArrowRight
} from "lucide-react";

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
    description: "Secure blockchain-based governance voting protocol with commit-reveal privacy on Solana",
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
          <Badge variant="secondary">Solana · Anchor · Blockchain</Badge>
          <h1 className="text-4xl font-bold mx-auto text-center tracking-tight sm:text-5xl">
            Chain Vote
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Secure governance voting on the blockchain
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link href="/about">
              <Button size="lg">Learn More <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
            <Link href="/admin">
              <Button size="lg" variant="outline">Admin Panel</Button>
            </Link>
          </div>
        </section>

        <Separator />

        {/* Election Lookup */}
        <section>
          <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                View Election
              </CardTitle>
              <CardDescription>
                Enter the admin public key to view election details and results
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
              <Button onClick={handleLookup} disabled={!adminKey.trim()} className="w-full">
                <Search className="mr-2 h-4 w-4" />
                View Election
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
