'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Localize } from '@deriv-com/translations';
import Link from 'next/link';

import { useDigitsTrading } from '../../hooks/use-digits-trading';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { useLogoSrc } from '@/components/custom/logo-src-provider';
import { Header } from '@/components/custom/header';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { Footer } from '@/components/custom/footer';
import { useAppTranslations } from '@/components/custom/i18n-provider';
import { PositionsTable } from '@/components/custom/positions-table';

const DIGIT_CONTRACT_TYPES = [
  'DIGITMATCH',
  'DIGITDIFF',
  'DIGITOVER',
  'DIGITUNDER',
  'DIGITEVEN',
  'DIGITODD',
] as const;

function getDigitContractLabels(
  localize: (text: string) => string
): Record<string, string> {
  return {
    DIGITMATCH: localize('Digit Match'),
    DIGITDIFF: localize('Digit Differs'),
    DIGITOVER: localize('Digit Over'),
    DIGITUNDER: localize('Digit Under'),
    DIGITEVEN: localize('Digit Even'),
    DIGITODD: localize('Digit Odd'),
  };
}

function formatMoney(value: number, currency = 'USD') {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)} ${currency}`;
}

function StatCard({
  label,
  value,
  subtext,
  positive,
}: {
  label: string;
  value: string;
  subtext?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>

      <p
        className={[
          'mt-2 text-2xl font-bold tracking-tight',
          positive === true ? 'text-green-600' : '',
          positive === false ? 'text-destructive' : '',
        ].join(' ')}
      >
        {value}
      </p>

      {subtext && (
        <p className="mt-1 text-xs text-muted-foreground">
          {subtext}
        </p>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const logoSrc = useLogoSrc();
  const router = useRouter();
  const { localize } = useAppTranslations();

  const {
    ws,
    isConnected,
    isExhausted,
    auth,
  } = useDerivWSContext();

  const {
    authState,
    accounts,
    activeAccount,
    login,
    signUp,
    logout,
    switchAccount,
  } = auth;

  const trading = useDigitsTrading({
    ws,
    isConnected,
    isExhausted,
    isAuthenticated: !!auth.wsUrl,
    onAuthWSFailed: logout,
  });

  const digitContractLabels = getDigitContractLabels(localize);

  useEffect(() => {
    if (authState === 'unauthenticated' || authState === 'error') {
      router.replace('/');
    }
  }, [authState, router]);

  const closedPositions = useMemo(
    () =>
      trading.closedPositions.filter((p) =>
        (DIGIT_CONTRACT_TYPES as readonly string[]).includes(
          p.contract_type
        )
      ),
    [trading.closedPositions]
  );

  const openPositions = useMemo(
    () =>
      trading.openPositions.filter((p) =>
        (DIGIT_CONTRACT_TYPES as readonly string[]).includes(
          p.contract_type
        )
      ),
    [trading.openPositions]
  );

  const stats = useMemo(() => {
    const totalTrades = closedPositions.length;

    const wins = closedPositions.filter(
      (trade) => trade.sell_price > trade.buy_price
    ).length;

    const losses = closedPositions.filter(
      (trade) => trade.sell_price <= trade.buy_price
    ).length;

    const totalProfit = closedPositions.reduce(
      (sum, trade) => sum + (trade.sell_price - trade.buy_price),
      0
    );

    const totalStake = closedPositions.reduce(
      (sum, trade) => sum + trade.buy_price,
      0
    );

    const winRate =
      totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    const averageProfit =
      totalTrades > 0 ? totalProfit / totalTrades : 0;

    return {
      totalTrades,
      wins,
      losses,
      totalProfit,
      totalStake,
      winRate,
      averageProfit,
    };
  }, [closedPositions]);

  if (authState !== 'authenticated') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <Header
        authState={authState}
        accounts={accounts}
        activeAccount={activeAccount}
        onLogin={login}
        onSignUp={signUp}
        onLogout={logout}
        onSwitchAccount={switchAccount}
        logoSrc={logoSrc}
        actions={<ThemeToggle />}
      />

      <div className="h-[76px] shrink-0" />

      <div className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 pb-16 sm:px-4 sm:py-6">

        {/* Back */}
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <span className="text-base leading-none">←</span>
          <span>
            <Localize i18n_default_text="Back" />
          </span>
        </Link>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            <Localize i18n_default_text="Trading Reports" />
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            <Localize i18n_default_text="Your digit trading performance" />
          </p>
        </div>

        {/* Main statistics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

          <StatCard
            label={localize('Total Trades')}
            value={stats.totalTrades.toString()}
            subtext={`${openPositions.length} ${localize('currently open')}`}
          />

          <StatCard
            label={localize('Win Rate')}
            value={`${stats.winRate.toFixed(1)}%`}
            subtext={`${stats.wins} ${localize('wins')} · ${stats.losses} ${localize('losses')}`}
          />

          <StatCard
            label={localize('Net P&L')}
            value={formatMoney(stats.totalProfit)}
            positive={
              stats.totalProfit > 0
                ? true
                : stats.totalProfit < 0
                  ? false
                  : undefined
            }
            subtext={localize('Completed trades')}
          />

          <StatCard
            label={localize('Average P&L')}
            value={formatMoney(stats.averageProfit)}
            positive={
              stats.averageProfit > 0
                ? true
                : stats.averageProfit < 0
                  ? false
                  : undefined
            }
            subtext={localize('Per completed trade')}
          />
        </div>

        {/* Secondary statistics */}
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">

          <StatCard
            label={localize('Winning Trades')}
            value={stats.wins.toString()}
            positive={stats.wins > 0}
          />

          <StatCard
            label={localize('Losing Trades')}
            value={stats.losses.toString()}
            positive={stats.losses > 0 ? false : undefined}
          />

          <StatCard
            label={localize('Total Stake')}
            value={`${stats.totalStake.toFixed(2)} USD`}
            subtext={localize('Across completed trades')}
          />
        </div>

        {/* Positions / history */}
        <div className="mt-7">
          <PositionsTable
            openPositions={openPositions}
            closedPositions={closedPositions}
            onSell={trading.sellContract}
            sellingId={trading.sellingId}
            sellError={trading.sellError}
            onClearSellError={trading.clearSellError}
            contractTypeLabels={digitContractLabels}
            className="mt-0"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background/80 py-2 text-center backdrop-blur-sm">
        <Footer />
      </div>
    </main>
  );
}
