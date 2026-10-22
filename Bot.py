# =====================================================
# TRUST WALLET BOT - BNB SMART CHAIN
# COMPLETE DIAGNOSTIC / READ-ONLY VERSION
# NO PRIVATE KEYS - NO APPROVALS - NO REAL TRANSFERS
# =====================================================

import json
import urllib.request
from datetime import datetime
from decimal import Decimal

RPC_URLS = [
    "https://bsc-dataseed.bnbchain.org/",
    "https://bsc-dataseed1.bnbchain.org/",
    "https://bsc-dataseed2.bnbchain.org/",
]
CHAIN_ID_EXPECTED = 56
SGT_TOKEN = "0x227c706300aD4DF617358E51dE443c6Dc466353E"
USDT_TOKEN = "0x55d398326f99059fF775485246999027B3197955"
GIFT_DISTRIBUTE_CONTRACT = "0x7A4F5D605E88831e3Eb3f9630029ff008d00E4d0"
REWARD_CONTRACT = "0x6bD7671Ec2B11Dc32F204641d67084977E5C81f9"

history = []
active_rpc = None


def record(message):
    history.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}")


def rpc(method, params=None):
    """Send a public JSON-RPC request to BNB Smart Chain."""
    global active_rpc
    errors = []
    servers = ([active_rpc] if active_rpc else []) + [u for u in RPC_URLS if u != active_rpc]
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
            return result.get("result")
        except Exception as exc:
            errors.append(f"{server} -> {exc}")
    raise RuntimeError("All RPC servers failed: " + " | ".join(errors))


def is_address(address):
    if not isinstance(address, str) or not address.startswith("0x") or len(address) != 42:
        return False
    try:
        int(address[2:], 16)
        return True
    except ValueError:
        return False


def read_call(address, data):
    return rpc("eth_call", [{"to": address, "data": data}, "latest"])


def decode_abi_string(result):
    if not result or result == "0x":
        return "Unavailable"
    try:
        raw = bytes.fromhex(result[2:])
        if len(raw) >= 64:
            offset = int.from_bytes(raw[:32], "big")
            if offset + 32 <= len(raw):
                size = int.from_bytes(raw[offset:offset + 32], "big")
                start = offset + 32
                end = start + size
                if end <= len(raw):
                    return raw[start:end].decode("utf-8", errors="replace")
        return raw.rstrip(b"\x00").decode("utf-8", errors="replace")
    except Exception:
        return "Could not decode"


def contract_report(address, title):
    print(f"\n--- {title} ---")
    print("Address:", address)
    try:
        code = rpc("eth_getCode", [address, "latest"])
        if not code or code == "0x":
            print("Contract code: NOT FOUND")
            record(f"{title}: no contract code found")
            return False
        print("Contract code: FOUND")
        print("Runtime code size:", max(0, (len(code) - 2) // 2), "bytes")
        record(f"{title}: contract code found")
        return True
    except Exception as exc:
        print("Check failed:", exc)
        record(f"{title}: check failed")
        return False


def token_report(address, title):
    if not contract_report(address, title):
        return
    calls = [
        ("Name", "06fdde03", decode_abi_string),
        ("Symbol", "95d89b41", decode_abi_string),
        ("Decimals", "313ce567", lambda x: int(x, 16)),
        ("Total supply (raw units)", "18160ddd", lambda x: int(x, 16)),
    ]
    for label, selector, decoder in calls:
        try:
            result = read_call(address, "0x" + selector)
            print(f"{label}:", decoder(result))
        except Exception as exc:
            print(f"{label}: unavailable ({exc})")


def check_network():
    print("\n--- BNB SMART CHAIN CONNECTION ---")
    try:
        chain_id = int(rpc("eth_chainId"), 16)
        block_number = int(rpc("eth_blockNumber"), 16)
        print("Chain ID:", chain_id)
        print("Latest block:", block_number)
        print("RPC server:", active_rpc)
        if chain_id == CHAIN_ID_EXPECTED:
            print("Network check: SUCCESS - BNB Smart Chain")
            record("Network check successful")
        else:
            print("Network check: WARNING - unexpected chain ID")
            record(f"Unexpected chain ID: {chain_id}")
    except Exception as exc:
        print("Network check failed:", exc)
        print("Check your internet connection or try again later.")
        record("Network check failed")


def check_all_contracts():
    print("\n=== CONTRACT AND TOKEN CHECK ===")
    contract_report(GIFT_DISTRIBUTE_CONTRACT, "Gift / Distribute contract")
    contract_report(REWARD_CONTRACT, "Pay Reward contract")
    token_report(SGT_TOKEN, "SGT token")
    token_report(USDT_TOKEN, "USDT token")


def check_wallet_balances():
    address = input("Enter PUBLIC wallet address (0x...): ").strip()
    if not is_address(address):
        print("Invalid address format. No request was sent.")
        return
    print("\n--- PUBLIC WALLET BALANCES ---")
    print("Wallet:", address)
    try:
        wei = int(rpc("eth_getBalance", [address, "latest"]), 16)
        bnb = Decimal(wei) / Decimal(10 ** 18)
        print("BNB balance:", f"{bnb:.8f}")
    except Exception as exc:
        print("BNB balance unavailable:", exc)
    padded_address = address[2:].lower().rjust(64, "0")
    for title, token in (("SGT", SGT_TOKEN), ("USDT", USDT_TOKEN)):
        try:
            result = read_call(token, "0x70a08231" + padded_address)
            raw_balance = int(result, 16)
            if title == "USDT":
                balance = Decimal(raw_balance) / Decimal(10 ** 18)
            else:
                try:
                    decimals_result = read_call(token, "0x313ce567")
                    decimals = int(decimals_result, 16)
                except Exception:
                    decimals = 18
                balance = Decimal(raw_balance) / (Decimal(10) ** decimals)
            print(f"{title} balance:", f"{balance:.8f}")
        except Exception as exc:
            print(f"{title} balance unavailable:", exc)
    record("Checked public wallet balances")


def simulate_operation(name, cap):
    print(f"\n--- {name.upper()} SIMULATION ---")
    print("Mode: READ-ONLY / SIMULATION")
    print("Real transactions: DISABLED")
    print("Configured display cap:", cap, "USDT")
    print("This option does not call a transaction function or move funds.")
    print("Contract function names and permissions must be verified before real use.")
    record(f"Simulated {name}; no transaction sent")


def view_history():
    print("\n--- OPERATION HISTORY (THIS RUN ONLY) ---")
    if not history:
        print("No operations recorded in this session.")
        return
    for item in history:
        print(item)


def show_addresses():
    print("\n--- CONFIGURED ADDRESSES ---")
    print("Network: BNB Smart Chain")
    print("Expected chain ID:", CHAIN_ID_EXPECTED)
    print("Gift / Distribute:", GIFT_DISTRIBUTE_CONTRACT)
    print("Pay Reward:", REWARD_CONTRACT)
    print("SGT token:", SGT_TOKEN)
    print("USDT token:", USDT_TOKEN)
    print("Reminder: confirm every address from trusted official documentation before relying on it.")


def main():
    while True:
        print("\n" + "=" * 43)
        print("       TRUST WALLET BOT")
        print("       BNB SMART CHAIN")
        print("       READ-ONLY DIAGNOSTICS")
        print("=" * 43)
        print("1. Gift (simulation only)")
        print("2. Distribute (simulation only)")
        print("3. Pay Reward (simulation only)")
        print("4. Check network connection")
        print("5. Check all contracts and tokens")
        print("6. Check public wallet balances")
        print("7. View operation history")
        print("8. View configured addresses")
        print("0. Exit")
        choice = input("Choose an option: ").strip()

        if choice == "1":
            simulate_operation("Gift", 30)
        elif choice == "2":
            simulate_operation("Distribute", 30)
        elif choice == "3":
            simulate_operation("Pay Reward", 40)
        elif choice == "4":
            check_network()
        elif choice == "5":
            check_all_contracts()
        elif choice == "6":
            check_wallet_balances()
        elif choice == "7":
            view_history()
        elif choice == "8":
            show_addresses()
        elif choice == "0":
            print("Program stopped safely. No transactions were sent.")
            break
        else:
            print("Invalid choice. Enter a number from 0 to 8.")
        input("\nPress Enter to return to the menu...")


if __name__ == "__main__":
    try:
        main()
    except (EOFError, KeyboardInterrupt):
        print("\nProgram stopped safely. No transactions were sent.")
    except Exception as exc:
        print("\nUnexpected error:", exc)
        print("Program stopped safely. No transactions were sent.")
