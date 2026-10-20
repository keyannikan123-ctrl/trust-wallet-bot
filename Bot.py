import json
import urllib.request
import urllib.error
from datetime import datetime

# TRUST WALLET BOT
# BNB Smart Chain - Monitoring Prototype
# Real transfers are disabled for safety.

GIFT_DISTRIBUTE_CONTRACT = (
    "0x7A4F5D605E88831e3Eb3f9630029ff008d00E4d0"
)

REWARD_CONTRACT = (
    "0x6bD7671Ec2B11Dc32F204641d67084977E5C81f9"
)

LIMITS = {
    "Gift": 30,
    "Distribute": 30,
    "Pay Reward": 40
}

RPC_ENDPOINTS = [
    "https://bsc-dataseed.binance.org/",
    "https://bsc-rpc.publicnode.com",
    "https://1rpc.io/bnb"
]

operations = []


def check_network_connection():
    print("\nChecking BNB Smart Chain connection...\n")

    payload = json.dumps({
        "jsonrpc": "2.0",
        "method": "eth_chainId",
        "params": [],
        "id": 1
    }).encode("utf-8")

    for rpc in RPC_ENDPOINTS:
        print("Trying:", rpc)

        request = urllib.request.Request(
            rpc,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        try:
            with urllib.request.urlopen(
                request, timeout=5
            ) as response:
                result = json.loads(
                    response.read().decode("utf-8")
                )

            chain_id = result.get("result")

            if chain_id and int(chain_id, 16) == 56:
                print("\nSUCCESS: Connected to BNB Smart Chain.")
                print("Network Chain ID: 56")
                return True

            print("This endpoint did not confirm BNB Smart Chain.")

        except Exception as error:
            print("Connection attempt failed:", str(error))

    print("\nConnection could not be confirmed.")
    print("The online Python service may block internet access.")
    return False


def view_status():
    print("\n========== BOT STATUS ==========")
    print("Gift limit: $30")
    print("Distribute limit: $30")
    print("Pay Reward limit: $40")
    print("Combined configured limit: $100")
    print("Real transfers: DISABLED")
    print("================================")


def view_history():
    print("\n====== OPERATION HISTORY ======")

    if not operations:
        print("No operations recorded in this session.")
    else:
        for item in operations:
            print(item)

    print("================================")


def view_contracts():
    print("\n====== CONTRACT ADDRESSES ======")
    print("Gift / Distribute:")
    print(GIFT_DISTRIBUTE_CONTRACT)
    print("\nPay Reward:")
    print(REWARD_CONTRACT)
    print("\nAddresses have not been independently verified.")
    print("================================")


def main():
    while True:
        print("\n==============================")
        print("       TRUST WALLET BOT")
        print("==============================")
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
            print("Gift monitoring is not configured.")
            print("Real transfers are disabled.")

        elif choice == "2":
            print("Distribution monitoring is not configured.")
            print("Real transfers are disabled.")

        elif choice == "3":
            print("Reward monitoring is not configured.")
            print("Real transfers are disabled.")

        elif choice == "4":
            view_status()

        elif choice == "5":
            view_history()

        elif choice == "6":
            check_network_connection()

        elif choice == "7":
            view_contracts()

        elif choice == "0":
            print("Bot stopped.")
            break

        else:
            print("Invalid option. Enter a number from 0 to 7.")


if __name__ == "__main__":
    main()
