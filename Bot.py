# Trust Wallet Bot
# BNB Smart Chain
# Safe management and monitoring prototype

from decimal import Decimal, InvalidOperation
from datetime import datetime

GIFT_DISTRIBUTE_CONTRACT = (
    "0x7A4F5D605E88831e3Eb3f9630029ff008d00E4d0"
)

REWARD_CONTRACT = (
    "0x6bD7671Ec2B11Dc32F204641d67084977E5C81f9"
)

NETWORK = "BNB Smart Chain"
CURRENCY = "USD"

LIMITS = {
    "Gift": Decimal("30.00"),
    "Distribute": Decimal("30.00"),
    "Pay Reward": Decimal("40.00"),
}

totals = {
    "Gift": Decimal("0.00"),
    "Distribute": Decimal("0.00"),
    "Pay Reward": Decimal("0.00"),
}

history = []


def show_menu():
    print("\n" + "=" * 32)
    print("       TRUST WALLET BOT")
    print("=" * 32)
    print("Network:", NETWORK)
    print("-" * 32)
    print("1. Gift")
    print("2. Distribute")
    print("3. Pay Reward")
    print("4. View All Status")
    print("5. View Operation History")
    print("0. Exit")
    print("=" * 32)


def get_amount():
    try:
        value = input("Enter amount in USD: ").strip()
        amount = Decimal(value)

        if not amount.is_finite() or amount <= 0:
            print("Error: Amount must be greater than zero.")
            return None

        return amount.quantize(Decimal("0.01"))

    except (InvalidOperation, ValueError):
        print("Error: Enter a valid amount.")
        return None


def show_status(section):
    print("\n---", section, "Status ---")
    print("Recorded total:", totals[section], CURRENCY)
    print("Configured limit:", LIMITS[section], CURRENCY)
    print("Network:", NETWORK)
    print("Real transfers: NOT ENABLED")


def show_all_status():
    print("\n========== ALL STATUS ==========")

    for section in LIMITS:
        show_status(section)

    print("================================")


def handle_option(section):
    print("\nSelected:", section)

    show_status(section)

    amount = get_amount()

    if amount is None:
        return

    if totals[section] + amount > LIMITS[section]:
        print("\nOperation stopped.")
        print("The configured limit would be exceeded.")
        return

    print("\nOperation details")
    print("Type:", section)
    print("Amount:", amount, CURRENCY)
    print("Time:", datetime.now().isoformat(timespec="seconds"))

    print("\nNo payment has been sent.")
    print("Blockchain payment integration is not configured.")

    history.append({
        "type": section,
        "amount": str(amount),
        "time": datetime.now().isoformat(timespec="seconds"),
        "status": "NOT SENT",
    })


def show_history():
    print("\n========== OPERATION HISTORY ==========")

    if not history:
        print("No operations recorded.")
        return

    for number, item in enumerate(history, start=1):
        print("\nOperation:", number)
        print("Type:", item["type"])
        print("Amount:", item["amount"], CURRENCY)
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
        show_menu()

        choice = input("Choose an option: ").strip()

        if choice in sections:
            handle_option(sections[choice])

        elif choice == "4":
            show_all_status()

        elif choice == "5":
            show_history()

        elif choice == "0":
            print("\nTrust Wallet Bot closed.")
            break

        else:
            print("\nInvalid option. Choose 0, 1, 2, 3, 4, or 5.")


if __name__ == "__main__":
    main()
