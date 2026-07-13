import { formatCatdexNumber } from '../../lib/catdex';

interface CatdexLabelProps {
  catdexNumber?: number;
  label?: string;
}

export default function CatdexLabel({
  catdexNumber,
  label = 'FOUND CAT CARD',
}: CatdexLabelProps) {
  return (
    <div className="inline-flex min-w-[116px] flex-col border-2 border-black bg-[#fffdf2] px-3 py-2 text-right shadow-[4px_4px_0_rgba(0,0,0,0.88)]">
      <span className="font-cat-number text-[10px] font-bold uppercase leading-none text-black">
        {formatCatdexNumber(catdexNumber)}
      </span>
      <span className="font-cat-number mt-1 text-[11px] font-bold leading-none text-[#2f5fb3]">
        {label}
      </span>
    </div>
  );
}
