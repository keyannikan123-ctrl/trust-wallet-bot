import React, { useState } from 'react';
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork
} from '@reown/appkit/react';
import {
  useBalance,
  useReadContract,
  useSimulateContract
} from 'wagmi';
import { formatUnits } from 'viem';

const BANK = '0x7a4f5d605e88831e3eb3f9630029ff008d00e4d0';
const SGT = '0x227c706300ad4df617358e51de443c6dc466353e';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const PAY = '0x6bd7671ec2b11dc32f204641d67084977e5c81f9';

const bankABI = [
  { type: 'function', name: '_currentGiftRound', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'giftListSize', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'globalTokenBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'usdtBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    type: 'function', name: 'ownerInfo', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [
      { name: 'ID', type: 'uint64' },
      { name: 'Total_Left', type: 'uint32' },
      { name: 'Total_Right', type: 'uint32' },
      { name: 'Current_Left', type: 'uint32' },
      { name: 'Current_Right', type: 'uint32' },
      { name: 'Directs_Count', type: 'uint8' },
      { name: 'Is_Right_Side', type: 'bool' },
      { name: 'UpLine_Address', type: 'address' },
      { name: 'Left_Address', type: 'address' },
      { name: 'Right_Address', type: 'address' }
    ]
  },
  {
    type: 'function', name: 'ownerBankInfo', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint64' }],
    outputs: [
      { name: 'Total_Gift_Received_USDT', type: 'uint256' },
      { name: 'Days_Passed_Since_Last_Gift', type: 'uint256' },
      { name: 'Has_Received_Free_Token', type: 'bool' },
      { name: 'Caller_Reward_Total_USDT', type: 'uint256' },
      { name: 'Hours_Passed_Since_Last_Caller', type: 'uint256' },
      { name: 'Hours_Passed_Since_Last_Buy', type: 'uint256' },
      { name: 'Claimed_Tier_1_Reward', type: 'bool' },
      { name: 'Claimed_Tier_2_Reward', type: 'bool' },
      { name: 'Claimed_Tier_3_Reward', type: 'bool' },
      { name: 'Claimed_Tier_4_Reward', type: 'bool' }
    ]
  },
  { type: 'function', name: 'distributeBank', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  {
    type: 'function', name: 'currentProposalStatus', stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'target', type: 'address' },
      { name: 'pType', type: 'uint8' },
      { name: 'votes300', type: 'uint256' },
      { name: 'votes100', type: 'uint256' },
      { name: 'stage', type: 'uint8' }
    ]
  }
];

const payABI = [
  { type: 'function', name: 'payReward', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'ownerStatus', stateMutability: 'view', inputs: [{ name: 'userAddress', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'ownerAllPoint', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint32' }] },
  { type: 'function', name: 'lastRewardTimePassed', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'justContractBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'newOwnerStatus', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'lastTotalPoint', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint32' }] },
  { type: 'function', name: 'lastValuePoint', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    type: 'function', name: 'ownerInfo', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [
      { name: 'ID', type: 'uint64' },
      { name: 'Total_Left', type: 'uint32' },
      { name: 'Total_Right', type: 'uint32' },
      { name: 'Current_Left', type: 'uint32' },
      { name: 'Current_Right', type: 'uint32' },
      { name: 'Directs_Count', type: 'uint8' },
      { name: 'Is_Right_Side', type: 'bool' },
      { name: 'UpLine_Address', type: 'address' },
      { name: 'Left_Address', type: 'address' },
      { name: 'Right_Address', type: 'address' }
    ]
  }
];

function field(data, name, index) {
  if (!data) return undefined;
  return data[name] ?? data[index];
}

function getErrorMessage(error) {
  if (!error) return '';
  return error.shortMessage ||
    error.details ||
    error.cause?.shortMessage ||
    error.cause?.message ||
    error.message ||
    'خطای نامشخص';
}

function fmt(value, decimals = 18) {
  if (value === undefined || value === null) return 'دریافت نشد';
  try {
    return Number(formatUnits(BigInt(value), decimals))
      .toLocaleString('en-US', { maximumFractionDigits: 4 });
  } catch {
    return String(value);
  }
}

function Value({ title, value, loading, error }) {
  let shown = 'دریافت نشد';

  if (loading) shown = 'در حال دریافت...';
  else if (error) shown
