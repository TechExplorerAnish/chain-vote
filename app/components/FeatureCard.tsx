import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type FeatureCardProps = {
    title: string;
    description: string;
    icon: ReactNode;
};

export default function FeatureCard({ title, description, icon }: FeatureCardProps) {
    return (
        <Card className="h-full">
            <CardHeader>
                <div className="icon-wrap" aria-hidden="true">
                    {icon}
                </div>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>{description}</CardDescription>
            </CardContent>
        </Card>
    );
}
