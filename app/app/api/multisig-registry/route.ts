import { NextRequest, NextResponse } from "next/server";
import { PinataSDK } from "pinata-web3";

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT!,
    pinataGateway: "gateway.pinata.cloud",
});

interface MultisigMetadata {
    authority: string; // The wallet that created the multisig
    multisigPda: string; // The derived PDA
    admins: string[]; // All admin wallet addresses
    threshold: number;
    createdAt: number;
}

// Store multisig metadata when created
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { authority, multisigPda, admins, threshold } = body;

        if (!authority || !multisigPda || !admins || !threshold) {
            return NextResponse.json(
                { error: "Missing required fields: authority, multisigPda, admins, threshold" },
                { status: 400 }
            );
        }

        const metadata: MultisigMetadata = {
            authority,
            multisigPda,
            admins,
            threshold,
            createdAt: Date.now(),
        };

        // Upload to Pinata with descriptive name
        const upload = await pinata.upload.json(metadata).addMetadata({
            name: `multisig-${authority.slice(0, 8)}`,
            keyValues: {
                type: "multisig-registry",
                authority,
                ...admins.reduce((acc: any, admin: string, idx: number) => {
                    acc[`admin${idx}`] = admin;
                    return acc;
                }, {}),
            },
        });

        return NextResponse.json({
            success: true,
            ipfsHash: upload.IpfsHash,
            gatewayUrl: `https://gateway.pinata.cloud/ipfs/${upload.IpfsHash}`,
        });
    } catch (error: any) {
        console.error("Error storing multisig metadata:", error);
        return NextResponse.json(
            { error: error.message || "Failed to store multisig metadata" },
            { status: 500 }
        );
    }
}

// Find multisig by admin wallet address
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const adminWallet = searchParams.get("admin");

        if (!adminWallet) {
            return NextResponse.json(
                { error: "Missing admin wallet parameter" },
                { status: 400 }
            );
        }

        // Query Pinata for files where this wallet is an admin
        const files = await pinata.listFiles().keyValue("type", "multisig-registry");

        // Find multisigs where this wallet is an admin
        const matchingMultisigs: MultisigMetadata[] = [];

        for (const file of files) {
            // Check if any admin keyvalue matches
            const keyValues = file.metadata?.keyvalues || {};
            const isAdmin = Object.values(keyValues).some(
                (value) => value === adminWallet
            );

            if (isAdmin || keyValues.authority === adminWallet) {
                try {
                    // Fetch the actual metadata
                    const response = await fetch(
                        `https://gateway.pinata.cloud/ipfs/${file.ipfs_pin_hash}`
                    );
                    const metadata = await response.json();
                    matchingMultisigs.push(metadata);
                } catch (err) {
                    console.error(`Failed to fetch metadata for ${file.ipfs_pin_hash}:`, err);
                }
            }
        }

        if (matchingMultisigs.length === 0) {
            return NextResponse.json(
                { error: "No multisig found for this admin" },
                { status: 404 }
            );
        }

        // Return the most recent one (in case multiple exist)
        matchingMultisigs.sort((a, b) => b.createdAt - a.createdAt);

        return NextResponse.json({
            success: true,
            multisig: matchingMultisigs[0],
            allMultisigs: matchingMultisigs,
        });
    } catch (error: any) {
        console.error("Error finding multisig:", error);
        return NextResponse.json(
            { error: error.message || "Failed to find multisig" },
            { status: 500 }
        );
    }
}
