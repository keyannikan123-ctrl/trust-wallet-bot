import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { bsc } from '@reown/appkit/networks';

const projectId = 'b61b178f47f8ddc2b92962f4385d862e';

const networks = [bsc];

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'Trust Wallet Connection',
    description: 'Read-only wallet connection on BNB Smart Chain',
    url: window.location.origin,
    icons: [],
  },
});

export const config = wagmiAdapter.wagmiConfig;
