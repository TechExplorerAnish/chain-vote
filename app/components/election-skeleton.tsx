"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ElectionSkeleton() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-5 w-20" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="space-y-1">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-5 w-12" />
                            </div>
                        ))}
                    </div>
                    <Skeleton className="h-px w-full" />
                    <Skeleton className="h-4 w-40" />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 py-3">
                            <Skeleton className="h-4 w-6" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="ml-auto h-4 w-8" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
