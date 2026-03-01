import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admin Panel",
    description:
        "Manage elections, create governance proposals, configure voting phases, register voters, and oversee the entire election lifecycle.",
    openGraph: {
        title: "Admin Panel | Chain Vote",
        description:
            "Manage elections, create governance proposals, and oversee the entire election lifecycle on Chain Vote.",
    },
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
