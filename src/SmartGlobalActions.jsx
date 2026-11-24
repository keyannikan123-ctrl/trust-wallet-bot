import React, { useState } from 'react';
import {
  useSimulateContract,
  useWriteContract,
} from 'wagmi';

import { CHAIN_ID, CONTRACTS } from './contracts/addresses';
import { bankAbi } from './contracts/abi';

const REFRESH_MS = 30000;

function display(value) {
  if (value === undefined || value === null) return '—';
  return String(value);
}

function errorText(error) {
  return (
    error?.shortMessage ||
    error?.cause?.shortMessage ||
    error?.message ||
    'شرایط اجرای تابع تأیید نشد.'
  );
}

function Check({ label, ok }) {
  return (
    <div className="row">
      <span>{label}</span>
      <b>{ok ? '✓' : '—'}</b>
    </div>
  );
}

export default function SmartGlobalActions({
  address,
  enabled,
  accountId,
  ownerData,
  giftData,
  pointsData,
  bankBalance,
  giftListSize,
  modes,
}) {
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [txHash, setTxHash] = useState('');

  const { writeContractAsync } = useWriteContract();

  const memberId = accountId == null
    ? 0n
    : BigInt(accountId);

  const isMember = memberId > 0n;

  const totalLeft = Number(ownerData?.Total_Left ?? ownerData?.[1] ?? 0);
  const totalRight = Number(ownerData?.Total_Right ?? ownerData?.[2] ?? 0);
  const totalTeam = totalLeft + totalRight;

  const giftReceived = Number(giftData?.[0] ?? 0);
  const daysSinceGift = Number(giftData?.[1] ?? 0);
  const callerReward = Number(giftData?.[3] ?? 0);
  const hoursSinceCaller = Number(giftData?.[4] ?? 0);
  const points = Number(pointsData ?? 0);

  const bankUSDT = Number(bankBalance ?? 0);
  const listSize = Number(giftListSize ?? 0);

  const giftBasicChecks =
    enabled &&
    isMember &&
    totalTeam <= 9 &&
    points === 0 &&
    giftReceived < 30 &&
    daysSinceGift >= 6 &&
    listSize < 500;

  const distributeBasicChecks =
    enabled &&
    isMember &&
    callerReward < 30 &&
    hoursSinceCaller >= 24 &&
    (
      bankUSDT >= 80 ||
      bankUSDT >= 36
    );

  const giftSimulation = useSimulateContract({
    address: CONTRACTS.BANK,
    abi: bankAbi,
    functionName: 'registerForGift',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: Boolean(enabled && isMember),
      refetchInterval: REFRESH_MS,
      retry: 0,
    },
  });

  const distributeSimulation = useSimulateContract({
    address: CONTRACTS.BANK,
    abi: bankAbi,
    functionName: 'distributeBank',
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: Boolean(enabled && isMember),
      refetchInterval: REFRESH_MS,
      retry: 0,
    },
  });

  const giftReady =
    Boolean(giftSimulation.isSuccess && giftSimulation.data?.request);

  const distributeReady =
    Boolean(
      distributeSimulation.isSuccess &&
      distributeSimulation.data?.request
    );

  async function executeAction(kind) {
    if (!enabled || !address || !isMember) {
      setMessage('اول کیف پول واجد شرایط را به شبکه BNB Smart Chain وصل کن.');
      return;
    }

    if (kind === 'gift' && modes?.gift !== 'MANUAL') {
      setMessage('برای اجرای دستی Gift، حالت آن را روی MANUAL بگذار.');
      return;
    }

    if (kind === 'distribute' && modes?.distribute !== 'MANUAL') {
      setMessage('برای اجرای دستی Distribute، حالت آن را روی MANUAL بگذار.');
      return;
    }

    const simulation =
      kind === 'gift'
        ? giftSimulation
        : distributeSimulation;

    setBusy(kind);
    setMessage('');
    setTxHash('');

    try {
      const result = await simulation.refetch();

      if (result.error) {
        throw result.error;
      }

      if (!result.data?.request) {
        throw new Error('شبیه‌سازی موفق نشد؛ تراکنش ارسال نمی‌شود.');
      }

      const hash = await writeContractAsync(result.data.request);

      setTxHash(hash);
      setMessage(
        kind === 'gift'
          ? 'درخواست Gift به کیف پول فرستاده شد. وضعیت تراکنش را بررسی کن.'
          : 'درخواست Distribute به کیف پول فرستاده شد. وضعیت تراکنش را بررسی کن.'
      );
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="panel">
      <h2>Gift و Distribute</h2>

      {!enabled && (
        <p className="notice">
          برای استفاده، کیف پول را به شبکه BNB Smart Chain وصل کن.
        </p>
      )}

      {enabled && !isMember && (
        <p className="notice">
          برای این آدرس Account ID معتبر پیدا نشد.
        </p>
      )}

      <div className="detail">
        <h3>Gift</h3>

        <div className="stats">
          <div className="stat">
            <small>Account ID</small>
            <b>{display(accountId)}</b>
          </div>

          <div className="stat">
            <small>Gift received</small>
            <b>{display(giftReceived)} USDT</b>
          </div>

          <div className="stat">
            <small>Days since Gift</small>
            <b>{display(daysSinceGift)}</b>
          </div>

          <div className="stat">
            <small>Team size</small>
            <b>{display(totalTeam)} / 9</b>
          </div>

          <div className="stat">
            <small>Points</small>
            <b>{display(points)}</b>
          </div>

          <div className="stat">
            <small>Gift list</small>
            <b>{display(listSize)} / 500</b>
          </div>
        </div>

        <Check label="عضویت معتبر" ok={isMember} />
        <Check label="مجموع تیم حداکثر ۹" ok={totalTeam <= 9} />
        <Check label="امتیاز صفر" ok={points === 0} />
        <Check label="دریافت کمتر از ۳۰ USDT" ok={giftReceived < 30} />
        <Check label="حداقل شش روز از Gift" ok={daysSinceGift >= 6} />
        <Check label="فهرست کمتر از ۵۰۰ نفر" ok={listSize < 500} />

        <p className="muted">
          بررسی نهایی شامل ثبت‌نام قبلی در دور جاری و زمان دقیق شش روز،
          توسط خود قرارداد انجام می‌شود.
        </p>

        <p className="muted">
          وضعیت شبیه‌سازی: {
            giftSimulation.isPending
              ? 'در حال بررسی...'
              : giftReady
                ? 'شرایط فعلاً تأیید شده'
                : giftSimulation.isError
                  ? 'شرایط تأیید نشد'
                  : 'در انتظار اطلاعات'
          }
        </p>

        {giftSimulation.isError && (
          <p className="notice">
            {errorText(giftSimulation.error)}
          </p>
        )}

        <button
          className="primary"
          disabled={
            !giftReady ||
            modes?.gift !== 'MANUAL' ||
            busy !== ''
          }
          onClick={() => executeAction('gift')}
        >
          {busy === 'gift' ? 'در حال ارسال...' : 'اشتراک در Gift'}
        </button>

        <p className="muted">
          حالت Gift: {modes?.gift || 'OFF'}
        </p>
      </div>

      <div className="detail">
        <h3>Distribute</h3>

        <div className="stats">
          <div className="stat">
            <small>Bank USDT</small>
            <b>{display(bankUSDT)} USDT</b>
          </div>

          <div className="stat">
            <small>Caller reward received</small>
            <b>{display(callerReward)} USDT</b>
          </div>

          <div className="stat">
            <small>Hours since Caller</small>
            <b>{display(hoursSinceCaller)}</b>
          </div>
        </div>

        <Check label="عضویت معتبر" ok={isMember} />
        <Check label="پاداش قبلی کمتر از ۳۰ USDT" ok={callerReward < 30} />
        <Check label="حداقل ۲۴ ساعت از پاداش قبلی" ok={hoursSinceCaller >= 24} />
        <Check label="موجودی قرارداد حداقل ۳۶ یا ۸۰ USDT" ok={bankUSDT >= 36} />

        <p className="muted">
          شرط دقیق یک ساعت از آخرین توزیع یا رسیدن موجودی به ۸۰ USDT
          و زمان دقیق بیشتر از ۲۴ ساعت، توسط شبیه‌سازی قرارداد بررسی می‌شود.
        </p>

        <p className="muted">
          وضعیت شبیه‌سازی: {
            distributeSimulation.isPending
              ? 'در حال بررسی...'
              : distributeReady
                ? 'شرایط فعلاً تأیید شده'
                : distributeSimulation.isError
                  ? 'شرایط تأیید نشد'
                  : 'در انتظار اطلاعات'
          }
        </p>

        {distributeSimulation.isError && (
          <p className="notice">
            {errorText(distributeSimulation.error)}
          </p>
        )}

        <button
          className="primary"
          disabled={
            !distributeReady ||
            modes?.distribute !== 'MANUAL' ||
            busy !== ''
          }
          onClick={() => executeAction('distribute')}
        >
          {busy === 'distribute' ? 'در حال ارسال...' : 'اجرای Distribute'}
        </button>

        <p className="muted">
          حالت Distribute: {modes?.distribute || 'OFF'}
        </p>
      </div>

      {message && (
        <p className="notice">{message}</p>
      )}

      {txHash && (
        <p className="notice">
          شناسه تراکنش:
          <br />
          <a
            href={`https://bscscan.com/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            مشاهده در BscScan
          </a>
        </p>
      )}

      <p className="notice">
        AUTO فقط اطلاعات را تازه می‌کند. هیچ تراکنشی خودکار ارسال نمی‌شود.
        هر تراکنش نیازمند تأیید صریح در کیف پول است.
      </p>
    </section>
  );
}
