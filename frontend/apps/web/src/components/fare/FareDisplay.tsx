import clsx from 'clsx';
import { FareSourceType } from '@buslanka/shared-types';

interface FareDisplayProps {
  amount: number | null;
  currency: string;
  status: FareSourceType;
  sourceName: string | null;
  effectiveFrom: string | null;
  updatedAt: string | null;
  disclaimer: string | null;
  className?: string;
}

export function FareDisplay({
  amount,
  currency,
  status,
  sourceName,
  effectiveFrom,
  updatedAt,
  disclaimer,
  className,
}: FareDisplayProps) {
  const isConfirmed = status === FareSourceType.NTC_OFFICIAL || status === FareSourceType.OPERATOR;
  const isEstimated = status === FareSourceType.ESTIMATED;
  const isUnavailable = status === FareSourceType.UNAVAILABLE || amount === null;

  return (
    <div className={clsx('rounded-lg border p-3', className, {
      'border-green-200 bg-green-50': isConfirmed,
      'border-amber-200 bg-amber-50': isEstimated,
      'border-red-200 bg-red-50': isUnavailable,
    })}>
      {/* Fare amount row */}
      <div className="flex items-center justify-between">
        {isUnavailable ? (
          <span className="text-danger font-medium text-sm">Fare unavailable</span>
        ) : (
          <span className={clsx('text-2xl font-bold', {
            'text-gray-900': isConfirmed,
            'text-amber-700': isEstimated,
          })}>
            {currency} {amount?.toFixed(2)}
          </span>
        )}

        {/* Status badge */}
        <span className={clsx('text-xs font-semibold px-2 py-1 rounded-full', {
          'bg-green-100 text-green-800': isConfirmed && status === FareSourceType.NTC_OFFICIAL,
          'bg-blue-100 text-blue-800': isConfirmed && status === FareSourceType.OPERATOR,
          'bg-amber-100 text-amber-800': isEstimated,
          'bg-red-100 text-red-800': isUnavailable,
        })}>
          {status === FareSourceType.NTC_OFFICIAL && '● NTC Approved'}
          {status === FareSourceType.OPERATOR && '● Operator Fare'}
          {status === FareSourceType.ESTIMATED && '● Estimated'}
          {status === FareSourceType.UNAVAILABLE && '● Unavailable'}
        </span>
      </div>

      {/* Source and date */}
      {!isUnavailable && sourceName && (
        <p className="text-xs text-gray-500 mt-1">
          {sourceName}
          {effectiveFrom && ` · Effective ${new Date(effectiveFrom).toLocaleDateString()}`}
        </p>
      )}

      {/* Updated at */}
      {updatedAt && (
        <p className="text-xs text-gray-400 mt-0.5">
          Last updated {new Date(updatedAt).toLocaleString()}
        </p>
      )}

      {/* Disclaimer (estimated or unavailable) */}
      {disclaimer && (
        <p
          className={clsx('text-xs mt-2 p-2 rounded', {
            'bg-amber-100 text-amber-800': isEstimated,
            'bg-red-100 text-red-800': isUnavailable,
          })}
          role="alert"
        >
          {disclaimer}
        </p>
      )}
    </div>
  );
}
