import { NextRequest, NextResponse } from "next/server";
import { PinataSDK } from "pinata-web3";

/**
 * POST /api/proof
 * Upload election proof JSON to Pinata IPFS
 * Returns: { ipfsHash: "Qm...", proofUri: "ipfs://Qm..." }
 */

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { election, candidateLeaves, merkleProofs, finalTallyRoot, slot, blockTime } = body;

        // ─────────────────────────────────────────────────────────────
        // Validate input
        // ─────────────────────────────────────────────────────────────
        if (!election || !candidateLeaves || !merkleProofs || !finalTallyRoot) {
            return NextResponse.json(
                { error: "Missing required fields: election, candidateLeaves, merkleProofs, finalTallyRoot" },
                { status: 400 }
            );
        }

        // ─────────────────────────────────────────────────────────────
        // Validate Pinata credentials
        // ─────────────────────────────────────────────────────────────
        const pinataJwt = process.env.PINATA_JWT;
        if (!pinataJwt) {
            return NextResponse.json(
                { error: "PINATA_JWT not configured" },
                { status: 500 }
            );
        }

        // ─────────────────────────────────────────────────────────────
        // Initialize Pinata SDK
        // ─────────────────────────────────────────────────────────────
        const pinata = new PinataSDK({
            pinataJwt,
        });

        // ─────────────────────────────────────────────────────────────
        // Create proof JSON object
        // ─────────────────────────────────────────────────────────────
        const proofData = {
            version: "1.0",
            election,
            finalTallyRoot,
            slot: slot || null,
            blockTime: blockTime || Math.floor(Date.now() / 1000),
            candidateLeaves,
            merkleProofs,
            uploadedAt: new Date().toISOString(),
        };

        // ─────────────────────────────────────────────────────────────
        // Upload to Pinata
        // ─────────────────────────────────────────────────────────────
        const blob = new Blob([JSON.stringify(proofData, null, 2)], { type: "application/json" });
        const file = new File([blob], "election-proof.json", { type: "application/json" });

        const uploadResponse = await pinata.upload.file(file);
        const ipfsHash = uploadResponse.IpfsHash;
        const proofUri = `ipfs://${ipfsHash}`;

        console.log(`[Pinata] Proof uploaded: ${proofUri}`);

        return NextResponse.json({
            success: true,
            ipfsHash,
            proofUri,
            metadata: {
                election,
                candidateCount: candidateLeaves.length,
                uploadedAt: proofData.uploadedAt,
            },
        });
    } catch (error) {
        console.error("[Pinata] Upload error:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Failed to upload proof to IPFS",
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/proof?hash=Qm...
 * Retrieve proof from IPFS gateway (optional - for verification)
 */
export async function GET(request: NextRequest) {
    try {
        const hash = request.nextUrl.searchParams.get("hash");
        if (!hash) {
            return NextResponse.json({ error: "Missing 'hash' query parameter" }, { status: 400 });
        }

        // Use public IPFS gateway
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
        const response = await fetch(gatewayUrl);

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch proof: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("[Pinata] Fetch error:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Failed to fetch proof from IPFS",
            },
            { status: 500 }
        );
    }
}
