"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Lock,
    Settings,
    Database,
    CheckCircle2,
    ArrowRight,
    Users,
    Zap,
    Shield,
    GitBranch,
    BarChart3,
    Clock,
    AlertCircle
} from "lucide-react";

export default function AboutPage() {
    const features = [
        {
            icon: <Lock className="h-6 w-6" />,
            title: "Commit-Reveal Voting",
            description: "Votes are committed as SHA-256 hashes with nonce and salt. Revealed only after voting closes for complete ballot privacy."
        },
        {
            icon: <Settings className="h-6 w-6" />,
            title: "Multisig Governance",
            description: "Admin actions require governance proposals with threshold-based approval. Replay-safe with nonce and expiry validation."
        },
        {
            icon: <Database className="h-6 w-6" />,
            title: "Deterministic PDAs",
            description: "Election, candidate, and voter accounts are derived from deterministic seeds. No off-chain state required."
        },
        {
            icon: <CheckCircle2 className="h-6 w-6" />,
            title: "On-Chain Audit Trail",
            description: "Every action emits events. Final tally root and proof committed on-chain for complete transparency."
        },
        {
            icon: <Shield className="h-6 w-6" />,
            title: "Secure Cryptography",
            description: "Built with Solana's security model and Anchor framework best practices for maximum protection."
        },
        {
            icon: <Users className="h-6 w-6" />,
            title: "Voter Management",
            description: "Whitelist-based voter registration with real-time tracking and detailed audit logs."
        }
    ];

    const workflow = [
        {
            num: "1",
            phase: "Setup",
            icon: "⚙️",
            description: "Initialize multisig authority and election parameters",
            details: ["Set up admin multisig", "Register governance proposal", "Set election time windows"]
        },
        {
            num: "2",
            phase: "Registration",
            icon: "📝",
            description: "Add candidates and register eligible voters",
            details: ["Add candidates to ballot", "Whitelist voter addresses", "Distribute voting credentials"]
        },
        {
            num: "3",
            phase: "Voting",
            icon: "🗳️",
            description: "Voters commit their votes with privacy",
            details: ["Voters create vote hash", "Submit commitment on-chain", "Cannot reveal until later"]
        },
        {
            num: "4",
            phase: "Reveal",
            icon: "🔍",
            description: "Voters reveal their votes for verification",
            details: ["Submit vote plaintext", "Blockchain verifies hash", "Votes counted automatically"]
        },
        {
            num: "5",
            phase: "Finalize",
            icon: "✅",
            description: "Publish results and audit trail",
            details: ["Calculate final tally", "Publish tally proof", "Lock election for audit"]
        }
    ];

    const useCases = [
        {
            title: "DAO Governance",
            icon: "🏛️",
            description: "Decentralized organizations can hold secure voting on proposals, treasury decisions, and governance changes."
        },
        {
            title: "Elections",
            icon: "🗣️",
            description: "Organizations and communities can conduct transparent and verifiable elections on the blockchain."
        },
        {
            title: "Hackathon Judging",
            icon: "🏆",
            description: "Judge submissions with anonymity and multisig approval for fair and transparent evaluation."
        },
        {
            title: "Stakeholder Voting",
            icon: "📊",
            description: "Companies and protocols can engage stakeholders in important decisions with cryptographic proof."
        }
    ];

    return (
        <div className="mx-auto max-w-6xl space-y-12 p-6">
            {/* Header */}
            <section className="space-y-4 pt-6">
                <Badge variant="secondary" className="bg-blue-600 hover:bg-blue-700">About Chain Vote</Badge>
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                        Secure Blockchain Voting
                    </h1>
                    <p className="max-w-3xl text-lg text-muted-foreground">
                        Chain Vote is a governance voting protocol built on Solana that combines commit-reveal privacy,
                        multisig governance, and transparent on-chain audit trails for secure decision-making.
                    </p>
                </div>
                <div className="flex gap-3 flex-wrap pt-4">
                    <Link href="/admin">
                        <Button size="lg">Open Admin Panel</Button>
                    </Link>
                    <Link href="/">
                        <Button size="lg" variant="outline">Back to Home</Button>
                    </Link>
                </div>
            </section>

            <Separator />

            {/* Core Features Grid */}
            <section className="space-y-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Core Features</h2>
                    <p className="text-muted-foreground">Built with cryptographic security and blockchain transparency</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature, idx) => (
                        <Card key={idx} className="border-amber-200 dark:border-amber-900 hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="text-amber-600 dark:text-amber-400">{feature.icon}</div>
                                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <Separator />

            {/* Election Workflow */}
            <section className="space-y-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Election Workflow</h2>
                    <p className="text-muted-foreground">Five-phase lifecycle from setup to finalization</p>
                </div>

                <div className="space-y-4">
                    {workflow.map((step, idx) => (
                        <div key={idx}>
                            <Card className="border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-2xl font-bold text-white">
                                                {step.icon}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-purple-600 hover:bg-purple-700">Phase {step.num}</Badge>
                                                    <CardTitle className="text-xl">{step.phase}</CardTitle>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {step.details.map((detail, detailIdx) => (
                                            <div key={detailIdx} className="flex items-center gap-2 text-sm">
                                                <ArrowRight className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                                <span>{detail}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                            {idx < workflow.length - 1 && (
                                <div className="flex justify-center py-2">
                                    <ArrowRight className="h-6 w-6 text-gray-400 rotate-90" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <Separator />

            {/* How It Works */}
            <section className="space-y-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
                    <p className="text-muted-foreground">Understanding the commit-reveal mechanism</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-green-200 dark:border-green-900">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-green-600" />
                                Commit Phase
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2 text-sm">
                                <p className="font-semibold">Voter Privacy Ensured</p>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    <li>Voter creates hash: SHA256(vote + nonce + salt)</li>
                                    <li>Submits commitment to blockchain</li>
                                    <li>Vote remains hidden and encrypted</li>
                                    <li>Cannot be changed after commit</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-200 dark:border-blue-900">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                Reveal Phase
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2 text-sm">
                                <p className="font-semibold">Transparent Verification</p>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    <li>After voting closes, voters reveal plaintext</li>
                                    <li>Blockchain verifies against commitment</li>
                                    <li>Automatic vote counting</li>
                                    <li>Immutable audit trail created</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <Separator />

            {/* Use Cases */}
            <section className="space-y-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Use Cases</h2>
                    <p className="text-muted-foreground">Real-world applications of Chain Vote</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {useCases.map((useCase, idx) => (
                        <Card key={idx} className="border-orange-200 dark:border-orange-900 hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <div className="text-3xl">{useCase.icon}</div>
                                    <CardTitle className="text-lg">{useCase.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{useCase.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <Separator />

            {/* Key Benefits */}
            <section className="space-y-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Key Benefits</h2>
                    <p className="text-muted-foreground">Why choose Chain Vote</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-cyan-200 dark:border-cyan-900 bg-cyan-50/30 dark:bg-cyan-950/20 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-5 w-5 text-cyan-600" />
                            <h3 className="font-semibold">Secure</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Cryptographically secure with no centralized vulnerabilities</p>
                    </div>

                    <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-950/20 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="h-5 w-5 text-green-600" />
                            <h3 className="font-semibold">Transparent</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">All actions and results verifiable on-chain</p>
                    </div>

                    <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-5 w-5 text-blue-600" />
                            <h3 className="font-semibold">Efficient</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Fast execution on Solana with minimal fees</p>
                    </div>
                </div>
            </section>

            <Separator />

            {/* Technical Stack */}
            <section className="space-y-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Technical Stack</h2>
                    <p className="text-muted-foreground">Built with modern blockchain technologies</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { name: "Solana", icon: "⛓️", desc: "Blockchain network" },
                        { name: "Anchor", icon: "🔗", desc: "Smart contract framework" },
                        { name: "Rust", icon: "🦀", desc: "Program language" },
                        { name: "Next.js", icon: "⚛️", desc: "Frontend framework" },
                        { name: "TypeScript", icon: "📘", desc: "Type safety" },
                        { name: "Tailwind CSS", icon: "🎨", desc: "Styling" },
                        { name: "Web3.js", icon: "🌐", desc: "RPC client" },
                        { name: "React", icon: "⚡", desc: "UI library" }
                    ].map((tech, idx) => (
                        <Card key={idx} className="text-center hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="text-4xl mb-2">{tech.icon}</div>
                                <CardTitle className="text-base">{tech.name}</CardTitle>
                                <CardDescription>{tech.desc}</CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </section>

            <Separator />

            {/* CTA Section */}
            <section className="rounded-lg border border-gradient bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-8 text-center space-y-4">
                <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Deploy your first election or explore the admin panel to see Chain Vote in action
                </p>
                <div className="flex justify-center gap-4 flex-wrap pt-4">
                    <Link href="/admin">
                        <Button size="lg">Admin Panel</Button>
                    </Link>
                    <Link href="/">
                        <Button size="lg" variant="outline">Home</Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}
