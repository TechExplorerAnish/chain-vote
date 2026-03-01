import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Chain Vote - Decentralized Governance Voting Protocol",
        short_name: "Chain Vote",
        description:
            "Secure blockchain-based governance voting protocol with commit-reveal privacy on Solana.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#000000",
        icons: [
            {
                src: "/favicon.ico",
                sizes: "any",
                type: "image/x-icon",
            },
        ],
    };
}
