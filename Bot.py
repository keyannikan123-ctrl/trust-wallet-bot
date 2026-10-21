# ==========================================
# TRUST WALLET BOT
# BNB SMART CHAIN
# UNIFIED DIAGNOSTIC VERSION
# READ-ONLY - NO REAL TRANSFERS
# ==========================================

import json
import urllib.request
import urllib.error
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


def rpc(method, params=None):
    global active_rpc

    errors = []

    servers = (
        ([active_rpc] if active_rpc else [])
        + [u for u in RPC_URLS if u != active_rpc]
    )

    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or [],
    }).encode()

    for server in servers:
        try:
            req = urllib.request.Request(
                server,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )

            with urllib.request.urlopen(req, timeout=12) as response:
                result = json.loads(response.read().decode())

            if "error" in result:
                raise RuntimeError(str(result["error"]))

            active_rpc = server
            return result["result"]

        except Exception as exc:
            errors.append(str(exc))

    raise RuntimeError("All RPC servers failed: " + "; ".join(errors))


def read_call(address, selector, arguments=""):
    data = "0x" + selector + arguments

    return rpc(
        "eth_call",
        [{"to": address, "data": data}, "latest"]
    )


def decode_string(result):
    if not result or result == "0x":
        return "Unavailable"

    raw = bytes.fromhex(result[2:])

    # Standard ABI dynamic string
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

    # Some tokens return bytes32
    try:
        return raw.rstrip(b"\x00").decode("utf-8")
    except UnicodeDecodeError:
        return "Could not decode"


def contract_report(address, title):
    print("\n---", title, "---")
    print("Address:", address)

    try:
        code = rpc("eth_getCode", [address, "latest"])

        if not code or code == "0x":
            print("Contract code: NOT FOUND")
            return False

        print("Contract code: FOUND")
        print("Runtime code size:", (len(code) - 2) // 2, "bytes")
        return True

    except Exception as exc:
        print("Check failed:", exc)
        return False


def token_report(address, title):
    print("\n---", title, "---")
    print("Address:", address)

    if not contract_report(address, title):
        return

    calls = [
        ("Name", "06fdde03", decode_string),
        ("Symbol", "95d89b41", decode_string),
        ("Decimals", "313ce567", lambda x: int(x, 16)),
        ("Total supply (raw units)", "18160ddd",
         lambda x: int(x, 16)),
    ]

    for label, selector, decoder in calls:
        try:
            result = read_call(address, selector)
            print(label + ":", decoder(result[2:]))
        except Exception as exc:
            print(label + ": Unavailable -", str(exc))


def check_network():
    print("\n--- BNB SMART CHAIN ---")

    try:
        chain_id = int(rpc("eth_chainId"), 16)
        block = int(rpc("eth_blockNumber"), 16)

        print("Chain ID:", chain_id)
        print("Latest block:", block)
        print("RPC:", "CONNECTED")
        print(
            "Expected network:",
            "YES" if chain_id == CHAIN_ID_EXPECTED else "NO"
        )

        if chain_id != CHAIN_ID_EXPECTED:
            print("WARNING: Unexpected chain. Stop here.")
            return False

        history.append("Network checked: BNB Smart Chain")
        return True

    except Exception as exc:
        print("Network error:", exc)
        return False


def check_all_contracts():
    contract_report(
        GIFT_DISTRIBUTE_CONTRACT,
        "GIFT / DISTRIBUTE CONTRACT"
    )

    contract_report(
        REWARD_CONTRACT,
        "PAY REWARD CONTRACT"
    )

    token_report(SGT_TOKEN, "SGT TOKEN")
    token_report(USDT_TOKEN, "USDT TOKEN")

    print("\nNote:")
    print("Existing code does not prove contract safety.")
    print("This report does not verify payment permissions.")
    history.append("Contract diagnostic completed.")


def check_wallet_balances():
    print("\nEnter a PUBLIC wallet address.")
    print("Never enter a private key or recovery phrase.")

    address = input("Wallet address (0x...): ").strip()

    if (
        len(address) != 42
        or not address.startswith("0x")
    ):
        print("Invalid address format.")
        return

    try:
        int(address[2:], 16)
    except ValueError:
        print("Address contains invalid characters.")
        return

    padded = address[2:].lower().rjust(64, "0")

    for title, token in [
        ("SGT", SGT_TOKEN),
        ("USDT", USDT_TOKEN),
    ]:
        try:
            result = read_call(
                token,
                "70a08231",
                padded
            )

            balance = int(result, 16)

            decimals_result = read_call(
                token,
                "313ce567"
            )

            decimals = int(decimals_result, 16)

            print(
                title + " balance:",
                Decimal(balance) / (Decimal(10) ** decimals)
            )

        except Exception as exc:
            print(title, "balance unavailable:", exc)

    print("These are read-only balance checks.")
    history.append("Public wallet balances checked.")


def simulate_operation(name, maximum):
    print("\n---", name, "---")
    print("SIMULATION ONLY. NO MONEY WILL BE SENT.")

    try:
        amount = Decimal(
            input("Enter test amount in USD: ").strip()
        )

        if not amount.is_finite() or amount <= 0:
            print("Amount must be greater than zero.")
            return

        if amount > maximum:
            print("Maximum simulation amount:", maximum)
            return

        print("Test amount:", amount)
        print("Simulation completed. No transfer occurred.")

        history.append(
            f"{name} simulated: ${amount:.2f}"
        )

    except (InvalidOperation, ValueError):
        print("Invalid number.")
    except (EOFError, KeyboardInterrupt):
        print("Cancelled.")


def show_history():
    print("\n--- HISTORY ---")

    if not history:
        print("No operations recorded.")
        return

    for item in history:
        print(item)


def main():
    while True:
        print("\n===================================")
        print("       TRUST WALLET BOT")
        print("===================================")
        print("1. Gift (simulation)")
        print("2. Distribute (simulation)")
        print("3. Pay Reward (simulation)")
        print("4. Check network")
        print("5. Check all contracts and tokens")
        print("6. Check public wallet balances")
        print("7. View operation history")
        print("0. Exit")

        choice = input("Choose an option: ").strip()

        if choice == "1":
            simulate_operation("Gift", Decimal("30"))
        elif choice == "2":
            simulate_operation("Distribute", Decimal("30"))
        elif choice == "3":
            simulate_operation("Pay Reward", Decimal("40"))
        elif choice == "4":
            check_network()
        elif choice == "5":
            if check_network():
                check_all_contracts()
        elif choice == "6":
            if check_network():
                check_wallet_balances()
        elif choice == "7":
            show_history()
        elif choice == "0":
            print("Bot closed.")
            break
        else:
            print("Invalid choice. Enter 0-7.")


if __name__ == "__main__":
    try:
        main()
    except (EOFError, KeyboardInterrupt):
        print("\nProgram stopped safely.")
    except Exception as exc
