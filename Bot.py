# ==========================================
# TRUST WALLET BOT
# BNB SMART CHAIN
# COMPLETE DIAGNOSTIC VERSION
# READ-ONLY - NO REAL TRANSFERS
# ==========================================

import json
import urllib.request
from datetime import datetime
from decimal import Decimal, InvalidOperation

RPC_URLS = [
    "https://bsc-dataseed.bnbchain.org/",
    "https://bsc-dataseed1.bnbchain.org/",
    "https://bsc-dataseed2.bnbchain.org/",
]

CHAIN_ID_EXPECTED = 56

SGT_TOKEN = "0x227c706300aD4DF617358E51dE443c6Dc466353E"
USDT_TOKEN = "0x55d398326f99059fF775485246999027B3197955"

GIFT_DISTRIBUTE_CONTRACT = (
    "0x7A4F5D605E88831e3Eb3f9630029ff008d00E4d0"
)

REWARD_CONTRACT = (
    "0x6bD7671Ec2B11Dc32F204641d67084977E5C81f9"
)

history = []
active_rpc = None


def record(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    history.append(f"[{timestamp}] {message}")


def rpc(method, params=None):
    global active_rpc

    errors = []
    servers = (
        ([active_rpc] if active_rpc else [])
        + [url for url in RPC_URLS if url != active_rpc]
    )

    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or [],
    }).encode("utf-8")

    for server in servers:
        try:
            request = urllib.request.Request(
                server,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )

            with urllib.request.urlopen(request, timeout=15) as response:
                result = json.loads(response.read().decode("utf-8"))

            if "error" in result:
                raise RuntimeError(str(result["error"]))

            active_rpc = server
            return result["result"]

        except Exception as exc:
            errors.append(f"{server}: {exc}")

    raise RuntimeError(
        "All RPC servers failed: " + " | ".join(errors)
    )


def read_call(address, selector, arguments=""):
    data = "0x" + selector + arguments
    return rpc(
        "eth_call",
        [{"to": address, "data": data}, "latest"],
    )


def decode_string(result):
    if not result or result == "0x":
        return "Unavailable"

    raw = bytes.fromhex(result[2:])

    if len(raw) >= 64:
        offset = int.from_bytes(raw[:32], "big")

        if offset + 32 <= len(raw):
            size = int.from_bytes(
                raw[offset:offset + 32], "big"
            )
            start = offset + 32
            end = start + size

            if end <= len(raw):
                try:
                    return raw[start:end].decode("utf-8")
                except UnicodeDecodeError:
                    pass

    try:
        return raw.rstrip(b"\x00").decode("utf-8")
    except UnicodeDecodeError:
        return "Could not decode"


def contract_report(address, title):
    print(f"\n--- {title} ---")
    print("Address:", address)

    try:
        code = rpc("eth_getCode", [address, "latest"])

        if not code or code == "0x":
            print("Contract code: NOT FOUND")
            record(f"{title}: contract code not found")
            return False

        print("Contract code: FOUND")
        print("Runtime code size:", (len(code) - 2) // 2, "bytes")
        record(f"{title}: contract code found")
        return True

    except Exception as exc:
        print("Check failed:", exc)
        record(f"{title}: check failed")
        return False


def token_report(address, title):
    print(f"\n--- {title} ---")
    print("Address:", address)

    if not contract_report(address, title):
        return

    calls = [
        ("Name", "06fdde03", decode_string),
        ("Symbol", "95d89b41", decode_string),
        ("Decimals", "313ce567", lambda value: int(value, 16)),
        (
            "Total supply (raw units)",
            "18160ddd",
            lambda value: int(value, 16),
        ),
    ]

    for label, selector, decoder in calls:
        try:
            result = read_call(address, selector)
            print(label + ":", decoder(result))
        except Exception as exc:
            print(f"{label}: Unavailable - {exc}")


def check_network():
    print("\n--- BNB SMART CHAIN ---")

    try:
        chain_id = int(rpc("eth_chainId"), 16)
        block_number = int(rpc("eth_blockNumber"), 16)

        print("Chain ID:", chain_id)
        print("Latest block:", block_number)
        print("RPC
