"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header skeleton */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <Skeleton className="h-4 w-64" />
            </div>

            {/* Admin key input skeleton */}
            <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
            </div>

            {/* Tabs skeleton */}
            <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-28" />
                    ))}
                </div>

                {/* Card content skeleton */}
                <Card>
                    <CardHeader className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-5" />
                            <Skeleton className="h-6 w-40" />
                        </div>
                        <Skeleton className="h-4 w-full max-w-md" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ))}
                        <Skeleton className="h-10 w-full sm:w-32" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-5" />
                            <Skeleton className="h-6 w-36" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            </div>
        </div>
    );
}
