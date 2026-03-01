import type { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: { id: string };
}): Promise<Metadata> {
    const electionId = params.id;

    return {
        title: `Election ${electionId.slice(0, 8)}...`,
        description:
            "View election details, cast your vote using commit-reveal mechanism, check voter status, and monitor real-time results on the Solana blockchain.",
        openGraph: {
            title: `Election ${electionId.slice(0, 8)}... | Chain Vote`,
            description:
                "View election details, cast your vote, and monitor real-time results on Chain Vote's secure blockchain voting platform.",
        },
    };
}

export default function ElectionLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
