# Trust Wallet Bot
# Educational project only

def show_menu():
    print("\n=== Trust Wallet Bot ===")
    print("1. Gift")
    print("2. Distribute")
    print("3. Reward")
    print("0. Exit")

while True:
    show_menu()
    choice = input("Choose an option: ")

    if choice == "1":
        print("Gift selected")
    elif choice == "2":
        print("Distribute selected")
    elif choice == "3":
        print("Reward selected")
    elif choice == "0":
        print("Goodbye!")
        break
    else:
        print("Invalid option")
