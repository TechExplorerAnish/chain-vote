import subprocess

result = subprocess.run(
    ["bash", "-c", "echo hello world"],
    capture_output=True,
    text=True
)

print("Output:")
print(result.stdout)

with open("voterid.txt","r") as f:
    voterid = f.read().strip().split("\n")
print("Voter IDs:")
for vid in voterid:
 result=   subprocess.run(
        ["bash", "-c", f"solana airdrop 100 {vid}"],text=True,capture_output=True,)
 print(f"Airdrop to {vid}:")
 print(result.stdout)
 print(result.stderr)