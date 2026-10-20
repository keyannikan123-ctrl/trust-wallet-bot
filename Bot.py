# Trust Wallet Bot
# BNB Smart Chain
# Contract Monitoring and Management
# Real transfers are disabled until contract verification.

from decimal import Decimal, InvalidOperation
from datetime import datetime
import json
import urllib.request
import urllib.error

GIFT_DISTRIBUTE_CONTRACT = (
    "0x7A4F5D605E88831e3Eb3f9630029ff008d00E4d0"
)

REWARD_CONTRACT = (
    "0x6bD7671Ec2B11Dc32F204641d67084977E5C81f9"
)

NETWORK = "BNB Smart Chain"
CHAIN_ID = 56
RPC_URL = "https://bsc-dataseed.binance.org/"

LIMITS = {
    "Gift": Decimal("30.00"),
    "Distribute": Decimal("30.00"),
    "Pay Reward": Decimal("40.00"),
}

totals = {name: Decimal("0.00") for name in LIMITS}
history = []


def rpc_request(method, params):
    payload = json.dumps({
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": 1,
    }).encode("utf-8")

    request = urllib.request.Request(
        RPC_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )

    with urllib.request.urlopen(request, timeout=15) as response:
        result = json.loads(response.read().decode("utf-8"))

    if "error" in result:
        raise RuntimeError(result["error"].get("message", "RPC error"))

    return result["result"]


def check_connection():
    try:
        chain_id = int(rpc_request("eth_chainId", []), 16)
        block = int(rpc_request("eth_blockNumber", []), 16)

        if chain_id != CHAIN_ID:
            print("Connected to the wrong network.")
            return False

        print("\nConnection successful.")
        print("Network:", NETWORK)
        print("Chain ID:", chain_id)
        print("Latest block:", block)
        return True

    except Exception as error:
        print("\nConnection failed:", error)
        return False


def check_contract(name, address):
    try:
        code = rpc_request("eth_getCode", [address, "latest"])

        if code == "0x":
            print(name + ": No contract code found.")
            return

        print(name + ": Contract code found.")
        print("Address:", address)

    except Exception as error:
        print(name + ": Check failed.")
        print("Reason:", error)


def check_all_contracts():
    print("\n========== CONTRACT STATUS ==========")

    check_contract("Gift / Distribute", GIFT_DISTRIBUTE_CONTRACT)
    check_contract("Pay Reward", REWARD_CONTRACT)

    print("\nThese checks do not verify contract safety or payment eligibility.")


def get_amount():
    try:
        amount = Decimal(input("Enter amount in USD: ").strip())

        if not amount.is_finite() or amount <= 0:
            print("Amount must be greater than zero.")
            return None

        return amount.quantize(Decimal("0.01"))

    except (InvalidOperation, ValueError):
        print("Please enter a valid amount.")
        return None


def show_status(section):
    print("\n---", section, "Status ---")
    print("Recorded total:", totals[section], "USD")
    print("Configured limit:", LIMITS[section], "USD")
    print("Network:", NETWORK)
    print("Real transfers: NOT ENABLED")


def handle_option(section):
    print("\nSelected:", section)
    show_status(section)

    amount = get_amount()
    if amount is None:
        return

    if totals[section] + amount > LIMITS[section]:
        print("Operation stopped: configured limit exceeded.")
        return

    timestamp = datetime.now().isoformat(timespec="seconds")

    history.append({
        "type": section,
        "amount": str(amount),
        "time": timestamp,
        "status": "NOT SENT",
    })

    print("\nOperation recorded locally.")
    print("Amount:", amount, "USD")
    print("Time:", timestamp)
    print("No blockchain transaction was sent.")


def show_all_status():
    print("\n========== ALL STATUS ==========")

    for section in LIMITS:
        show_status(section)

    print("================================")


def show_history():
    print("\n========== OPERATION HISTORY ==========")

    if not history:
        print("No operations recorded during this session.")
        return

    for number, item in enumerate(history, start=1):
        print("\nOperation:", number)
        print("Type:", item["type"])
        print("Amount:", item["amount"], "USD")
        print("Time:", item["time"])
        print("Status:", item["status"])

    print("\nNo blockchain transfers were made.")


def main():
    sections = {
        "1": "Gift",
        "2": "Distribute",
        "3": "Pay Reward",
    }

    while True:
        print("\n" + "=" * 36)
        print("         TRUST WALLET BOT")
        print("=" * 36)
        print("Network:", NETWORK)
        print("1. Gift")
        print("2. Distribute")
        print("3. Pay Reward")
        print("4. View All Status")
        print("5. View Operation History")
        print("6. Check Network Connection")
        print("7. Check Contract Addresses")
        print("0. Exit")
        print("=" * 36)

        choice = input("Choose an option: ").strip()

        if choice in sections:
            handle_option(sections[choice])
        elif choice == "4":
            show_all_status()
        elif choice == "5":
            show_history()
        elif choice == "6":
            check_connection()
        elif choice == "7":
            check_all_contracts()
        elif choice == "0":
            print("Trust Wallet Bot closed.")
            break
        else:
            print("Invalid option. Choose 0–7.")


if __name__ == "__main__":
    main()
