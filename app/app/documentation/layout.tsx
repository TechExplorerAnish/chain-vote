import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Documentation",
    description:
        "Complete guide to Chain Vote protocol: governance workflow, election lifecycle, commit-reveal voting mechanism, voter registration, and troubleshooting.",
    openGraph: {
        title: "Documentation | Chain Vote",
        description:
            "Complete guide to Chain Vote protocol: governance workflow, election lifecycle, commit-reveal voting mechanism, and more.",
    },
};

export default function DocumentationLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
