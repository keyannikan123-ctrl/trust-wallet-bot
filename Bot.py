# ==========================================
# TRUST WALLET BOT
# BNB SMART CHAIN
# SAFE READ-ONLY MONITORING
# REAL TRANSFERS DISABLED
# ==========================================

import json
import urllib.request
import urllib.error
import socket
import traceback
from datetime import datetime
from decimal import Decimal, InvalidOperation

RPC_URLS = [
    "https://bsc-dataseed.bnbchain.org/",
    "https://bsc-dataseed1.bnbchain.org/",
    "https://bsc-dataseed2.bnbchain.org/",
]

EXPECTED_CHAIN_ID = 56

GIFT_DISTRIBUTE_CONTRACT = (
    "0x7A4F5D605E88831e3Eb3f9630029ff008d00E4d0"
)

REWARD_CONTRACT = (
    "0x6bD7671Ec2B11Dc32F204641d67084977E5C81f9"
)

LIMITS = {
    "Gift": Decimal("30"),
    "Distribute": Decimal("30"),
    "Pay Reward": Decimal("40"),
}

history = []
active_rpc = None


def rpc(method, params=None):
    global active_rpc

    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or [],
    }).encode("utf-8")

    errors = []
    servers = ([active_rpc] if active_rpc else [])
    servers += [url for url in RPC_URLS if url not in servers]

    for server in servers:
        try:
            request = urllib.request.Request(
                server,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "TrustWalletBot-ReadOnly/1.0",
                },
                method="POST",
            )

            with urllib.request.urlopen(
                request, timeout=5
            ) as response:
                result = json.loads(
                    response.read().decode("utf-8")
                )

            if "error" in result:
                raise RuntimeError(str(result["error"]))

            active_rpc = server
            return result["result"]

        except Exception as error:
            errors.append(
                server + " -> " + str(error)
            )

    raise RuntimeError(
        "All RPC servers failed:\n" + "\n".join(errors)
    )


def record(message):
    timestamp = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )
    history.append(f"[{timestamp}] {message}")


def check_network():
    print("\n--- Real Network Check (Read-only) ---")
    print("Checking BNB Smart Chain connection...")

    try:
        chain_id = int(rpc("eth_chainId"), 16)

        if chain_id != EXPECTED_CHAIN_ID:
            print("Network: UNEXPECTED")
            print("Chain ID:", chain_id)
            record("Unexpected network detected.")
            return

        block = int(rpc("eth_blockNumber"), 16)

        print("Network: BNB Smart Chain")
        print("Chain ID:", chain_id)
        print("Latest block:", block)
        print("RPC connection: SUCCESS")
        print("Transactions sent: NONE")
        record(f"Network connected. Block: {block}")

    except Exception as error:
        print("\nNetwork connection: FAILED")
        print("Reason:", str(error))
        print("No transaction was sent.")
        record("Network connection failed.")

    finally:
        print("\nNetwork check finished.")
        print("You can return to the main menu.")


def check_contract(address, label):
    print(f"\n{label}: {address}")

    if (
        len(address) != 42
        or not address.startswith("0x")
    ):
        print("Address format: INVALID")
        return

    try:
        code = rpc("eth_getCode", [address, "latest"])

        if not code or code == "0x":
            print("Contract code: NOT FOUND")
        else:
            print("Contract code: FOUND")
            print("Code size:", (len(code) - 2) // 2, "bytes")

    except Exception as error:
        print("Could not verify contract:", str(error))


def show_contracts():
    print("\n--- On-chain Contract Check ---")
    check_contract(
        GIFT_DISTRIBUTE_CONTRACT, "Gift / Distribute"
    )
    check_contract(
        REWARD_CONTRACT, "Pay Reward"
    )
    print("\nFinding code does not prove a contract is safe.")
    record("Contract checks requested.")


def show_status():
    print("\n--- Bot Status ---")
    print("Network: BNB Smart Chain")
    print("Gift limit (simulation): $30")
    print("Distribute limit (simulation): $30")
    print("Pay Reward limit (simulation): $40")
    print("Real transfers: DISABLED")
    print("Private keys stored: NO")
    print("Network RPC:", "Connected" if active_rpc else "Not verified")
    record("Status viewed.")


def simulate_operation(name):
    print(f"\n--- {name}: Simulation Only ---")

    try:
        amount = Decimal(
            input("Enter test amount in USD: ").strip()
        )

        if not amount.is_finite() or amount <= 0:
            print("Invalid amount.")
            return

        if amount > LIMITS[name]:
            print(f"Limit exceeded: maximum ${LIMITS[name]}")
            return

        print(f"Test amount: ${amount:.2f}")
        print("Simulation only. No money was transferred.")
        record(f"{name} simulated: ${amount:.2f}")

    except (InvalidOperation, ValueError):
        print("Please enter a valid number.")
    except (EOFError, KeyboardInterrupt):
        print("\nInput cancelled safely.")


def show_history():
    print("\n--- Operation History ---")

    if not history:
        print("No operations recorded.")
    else:
        for item in history:
            print(item)


def main():
    while True:
        try:
            print("\n===================================")
            print("       TRUST WALLET BOT")
            print("===================================")
            print("1. Gift")
            print("2. Distribute")
            print("3. Pay Reward")
            print("4. View All Status")
            print("5. View Operation History")
            print("6. Check Network Connection")
            print("7. Check Contract Addresses")
            print("0. Exit")

            choice = input("\nChoose an option: ").strip()

            if choice == "1":
                simulate_operation("Gift")
            elif choice == "2":
                simulate_operation("Distribute")
            elif choice == "3":
                simulate_operation("Pay Reward")
            elif choice == "4":
                show_status()
            elif choice == "5":
                show_history()
            elif choice == "6":
                check_network()
            elif choice == "7":
                show_contracts()
            elif choice == "0":
                print("Bot closed safely.")
                break
            else:
                print("Invalid option. Enter 0-7.")

        except (EOFError, KeyboardInterrupt):
            print("\nInput ended by the online compiler.")
            break
        except Exception as error:
            print("\nUnexpected error:", str(error))
            print("The bot will try to continue.")

if __name__ == "__main__":
    try:
        main()
    except Exception:
        print("\nProgram stopped with an unexpected error:")
        traceback.print_exc()
