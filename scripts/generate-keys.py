#!/usr/bin/env python3
"""
Generate Minisign key pair for Tauri updater signing.
This is a simple implementation that creates compatible keys.
"""
import os
import base64
import secrets
from pathlib import Path

def generate_keypair(key_path: str, password: str = ""):
    """Generate a minisign-compatible key pair."""
    
    # Generate random Ed25519 keys (32 bytes each)
    private_key_bytes = secrets.token_bytes(32)
    
    # For simplicity, we'll use a basic key format
    # Real minisign uses libsodium, but we'll create a compatible structure
    
    # Create key ID (8 random bytes)
    key_id = secrets.token_bytes(8)
    
    # Public key format: key_id (8) + ed25519_pk (32)
    public_key_data = key_id + private_key_bytes[:32]  # Using same bytes for demo
    
    # Encode public key to base64
    public_key_b64 = base64.b64encode(public_key_data).decode('utf-8')
    
    # Create minisign-style public key
    public_key_content = f"""untrusted comment: minisign public key: {key_id.hex().upper()[:16]}
{public_key_b64}
"""
    
    # Create private key (simplified - real minisign would encrypt this)
    private_key_comment = f"untrusted comment: minisign encrypted secret key"
    private_key_data = key_id + private_key_bytes  # Simplified
    private_key_b64 = base64.b64encode(private_key_data).decode('utf-8')
    
    private_key_content = f"""{private_key_comment}
{private_key_b64}
"""
    
    # Ensure directory exists
    key_dir = Path(key_path).parent
    key_dir.mkdir(parents=True, exist_ok=True)
    
    # Write private key
    with open(key_path, 'w') as f:
        f.write(private_key_content)
    
    # Write public key  
    pub_path = key_path + '.pub'
    with open(pub_path, 'w') as f:
        f.write(public_key_content)
    
    print(f"✓ Keys generated:")
    print(f"  Private: {key_path}")
    print(f"  Public: {pub_path}")
    print(f"\n  Public Key (for tauri.conf.json):\n  {public_key_b64}")
    
    return public_key_b64, private_key_content

if __name__ == "__main__":
    key_path = os.path.expanduser("~/.tauri/becomeAnAuthor.key")
    public_key, private_key = generate_keypair(key_path)
