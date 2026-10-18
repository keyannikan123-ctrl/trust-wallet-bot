
# Trust Wallet Bot
# Educational project only
# BNB Smart Chain

GIFT_DISTRIBUTE_CONTRACT = (
    "0x7A4F5D605E88831e3Eb3f9630029ff008d00E4d0"
)

REWARD_CONTRACT = (
    "0x6bD7671Ec2B11Dc32F204641d67084977E5C81f9"
)


def show_menu():
    print("\n==========================")
    print("     TRUST WALLET BOT")
    print("==========================")
    print("1. Gift")
    print("2. Distribute")
    print("3. Pay Reward")
    print("0. Exit")


while True:
    show_menu()
    choice = input("Choose an option: ").strip()

    if choice == "1":
        print("Gift selected")
        print("Contract:", GIFT_DISTRIBUTE_CONTRACT)
        print("Transaction not connected yet.")

    elif choice == "2":
        print("Distribute selected")
        print("Contract:", GIFT_DISTRIBUTE_CONTRACT)
        print("Transaction not connected yet.")

    elif choice == "3":
        print("Pay Reward selected")
        print("Contract:", REWARD_CONTRACT)
        print("Transaction not connected yet.")

    elif choice == "0":
        print("Goodbye!")
        break

    else:
        print("Invalid option")
