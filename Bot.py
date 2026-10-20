
# Trust Wallet Bot
# Safe monitoring prototype
# BNB Smart Chain

GIFT_DISTRIBUTE_CONTRACT = (
    "0x7A4F5D605E88831e3Eb3f9630029ff008d00E4d0"
)

REWARD_CONTRACT = (
    "0x6bD7671Ec2B11Dc32F204641d67084977E5C81f9"
)

LIMITS = {
    "Gift": 30.0,
    "Distribute": 30.0,
    "Pay Reward": 40.0,
}

totals = {
    "Gift": 0.0,
    "Distribute": 0.0,
    "Pay Reward": 0.0,
}


def show_menu():
    print("\n==========================")
    print("     TRUST WALLET BOT")
    print("==========================")
    print("1. Gift")
    print("2. Distribute")
    print("3. Pay Reward")
    print("0. Exit")


def check_gift(left_has_referrals, right_has_referrals):
    if left_has_referrals and right_has_referrals:
        return False
    return None


def check_limit(section):
    return totals[section] < LIMITS[section]


def show_status(section):
    print("\n---", section, "Status ---")
    print("Current total:", totals[section], "USD")
    print("Limit:", LIMITS[section], "USD")
    print("Monitoring only: no transaction sent.")


def handle_option(section):
    print("\n", section, "selected.")

    if not check_limit(section):
        print(section, "limit reached. Stopped.")
        return

    show_status(section)


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

        elif choice == "0":
            print("Goodbye!")
            break

        else:
            print("Invalid option. Try again.")


if __name__ == "__main__":
    main()
