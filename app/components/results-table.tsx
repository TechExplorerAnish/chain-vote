"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CandidateAccount, ElectionAccount } from "@/lib/types";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Radar as RadarIcon } from "lucide-react";

interface Props {
    election: ElectionAccount;
    candidates: CandidateAccount[];
}

const COLORS = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#8b5cf6", // purple
    "#06b6d4", // cyan
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
];

export default function ResultsTable({ election, candidates }: Props) {
    const [activeTab, setActiveTab] = useState("table");

    const totalVotes = candidates.reduce(
        (sum, c) => sum + Number(c.revealedVotes),
        0
    );

    const sorted = [...candidates].sort(
        (a, b) => Number(b.revealedVotes) - Number(a.revealedVotes)
    );

    // Prepare data for charts
    const chartData = sorted.map((c, idx) => ({
        name: c.name,
        votes: Number(c.revealedVotes),
        party: c.party,
        percentage: totalVotes > 0 ? ((Number(c.revealedVotes) / totalVotes) * 100).toFixed(1) : "0.0",
        color: COLORS[idx % COLORS.length],
    }));

    // Cumulative data for line chart
    let cumulative = 0;
    const cumulativeData = chartData.map((d) => {
        cumulative += d.votes;
        return {
            name: d.name,
            cumulative,
            votes: d.votes,
        };
    });

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            📊 Election Results
                        </span>
                        <Badge variant="outline" className="bg-green-600/10 text-green-700 dark:text-green-400">
                            {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <TabsList className="flex gap-3 flex-wrap w-full">
                            <TabsTrigger value="table" className="flex items-center gap-2">
                                <span className="hidden sm:inline">Table</span>
                                <span className="sm:hidden">📋</span>
                            </TabsTrigger>
                            <TabsTrigger value="bar" className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 hidden sm:inline" />
                                <span className="hidden sm:inline">Bar</span>
                                <span className="sm:hidden">📊</span>
                            </TabsTrigger>
                            <TabsTrigger value="pie" className="flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4 hidden sm:inline" />
                                <span className="hidden sm:inline">Pie</span>
                                <span className="sm:hidden">🥧</span>
                            </TabsTrigger>
                            <TabsTrigger value="trend" className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 hidden sm:inline" />
                                <span className="hidden sm:inline">Trend</span>
                                <span className="sm:hidden">📈</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Table View */}
                        <TabsContent value="table" className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">Rank</TableHead>
                                        <TableHead>Candidate</TableHead>
                                        <TableHead>Party</TableHead>
                                        <TableHead className="text-right">Votes</TableHead>
                                        <TableHead className="text-right">Share</TableHead>
                                        <TableHead className="text-right w-24">Progress</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sorted.map((c, rank) => {
                                        const votes = Number(c.revealedVotes);
                                        const share = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : "0.0";
                                        const progress = (votes / Math.max(...sorted.map((c) => Number(c.revealedVotes)))) * 100;
                                        return (
                                            <TableRow key={c.index}>
                                                <TableCell className="font-mono font-bold">
                                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs">
                                                        {rank + 1}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-medium">{c.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-purple-600/10 text-purple-700 dark:text-purple-400">{c.party}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-green-600 dark:text-green-400">{votes}</TableCell>
                                                <TableCell className="text-right font-mono">{share}%</TableCell>
                                                <TableCell>
                                                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-linear-to-r from-blue-500 to-blue-600 transition-all"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TabsContent>

                        {/* Bar Chart */}
                        <TabsContent value="bar" className="space-y-4">
                            <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 p-4">
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                        <YAxis />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "rgba(0, 0, 0, 0.8)",
                                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                                borderRadius: "8px",
                                            }}
                                            labelStyle={{ color: "white" }}
                                            formatter={(value) => [value, "Votes"]}
                                        />
                                        <Legend />
                                        <Bar dataKey="votes" fill="#3b82f6" name="Votes" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                📊 Bar chart showing vote distribution across all candidates
                            </div>
                        </TabsContent>

                        {/* Pie Chart */}
                        <TabsContent value="pie" className="space-y-4">
                            <div className="rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20 p-4 flex justify-center">
                                <ResponsiveContainer width="100%" height={400}>
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => {
                                                const percentage = totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(1) : "0.0";
                                                return `${name} (${percentage}%)`;
                                            }}
                                            outerRadius={120}
                                            fill="#8884d8"
                                            dataKey="votes"
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `${value} votes`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                🥧 Pie chart showing vote share percentage for each candidate
                            </div>
                        </TabsContent>

                        {/* Cumulative Trend Line Chart */}
                        <TabsContent value="trend" className="space-y-4">
                            <div className="rounded-lg border border-cyan-200 dark:border-cyan-900 bg-cyan-50/30 dark:bg-cyan-950/20 p-4">
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={cumulativeData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                        <YAxis />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "rgba(0, 0, 0, 0.8)",
                                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                                borderRadius: "8px",
                                            }}
                                            labelStyle={{ color: "white" }}
                                            formatter={(value) => [value, "Cumulative Votes"]}
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="cumulative"
                                            stroke="#06b6d4"
                                            name="Cumulative Votes"
                                            strokeWidth={3}
                                            dot={{ fill: "#06b6d4", r: 6 }}
                                            activeDot={{ r: 8 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                📈 Cumulative trend showing running total of votes across candidates
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-green-200 dark:border-green-900">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{totalVotes}</div>
                        <p className="text-xs text-muted-foreground mt-1">Votes revealed</p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 dark:border-blue-900">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Leading Candidate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{sorted[0]?.name}</div>
                        <p className="text-xs text-muted-foreground mt-1">{Number(sorted[0]?.revealedVotes)} votes</p>
                    </CardContent>
                </Card>

                <Card className="border-amber-200 dark:border-amber-900">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Winner Margin</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-600">
                            {sorted.length > 1
                                ? Number(sorted[0]?.revealedVotes) - Number(sorted[1]?.revealedVotes)
                                : "–"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">votes ahead</p>
                    </CardContent>
                </Card>

                <Card className="border-purple-200 dark:border-purple-900">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Candidates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600">{candidates.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">on ballot</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tally Information */}
            {election.finalTallyRootSet && (
                <Card className="border-green-200 dark:border-green-900">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span>✓</span>
                            Results Published
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4 space-y-2">
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Final Tally Root: </span>
                                <span className="font-mono text-xs break-all text-green-700 dark:text-green-400">
                                    {election.finalTallyRoot
                                        .map((b) => b.toString(16).padStart(2, "0"))
                                        .join("")}
                                </span>
                            </div>
                            {election.proofUri && (
                                <div>
                                    <span className="text-sm font-medium text-muted-foreground">Proof URI: </span>
                                    <a
                                        href={election.proofUri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-green-600 dark:text-green-400 underline break-all"
                                    >
                                        View on IPFS
                                    </a>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
