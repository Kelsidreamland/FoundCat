import { memo } from 'react';
import { motion } from 'framer-motion';
import { ScrapbookItem } from '../store/useScrapbookStore';

interface ReelStickerProps {
  item: ScrapbookItem;
  layoutData: { x: number; y: number; r: number; s: number };
  onChange: (id: string, updates: { x?: number; y?: number; r?: number; s?: number }) => void;
  previewRef: React.RefObject<HTMLDivElement>;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const PREVIEW_ITEM_SIZE = 72;

export const ReelSticker = memo(function ReelSticker({
  item,
  layoutData,
  onChange,
  previewRef,
  isSelected,
  onSelect
}: ReelStickerProps) {
  
  return (
    <motion.div
      drag
      dragConstraints={previewRef}
      dragElastic={0.08}
      dragMomentum={false}
      onDragStart={() => onSelect(item.id)}
      onDragEnd={(_, info) => {
        onChange(item.id, { x: info.offset.x, y: info.offset.y });
      }}
      style={{
        position: 'absolute',
        width: PREVIEW_ITEM_SIZE,
        height: PREVIEW_ITEM_SIZE,
        left: 0,
        top: 0,
        x: layoutData.x,
        y: layoutData.y,
        rotate: layoutData.r,
        scale: layoutData.s,
        touchAction: 'none',
        zIndex: isSelected ? 30 : 10,
      }}
      className="cursor-grab active:cursor-grabbing"
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(item.id);
      }}
    >
      <motion.div
        className="w-full h-full relative"
        animate={{
          y: isSelected ? 0 : [0, -6, 0],
        }}
        transition={{
          duration: 3 + (item.id.charCodeAt(0) % 3),
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <img
          src={item.imageData}
          alt="sticker"
          className="w-full h-full object-contain pointer-events-none"
          style={{
            filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15)) drop-shadow(0px 1px 2px rgba(0,0,0,0.1))',
          }}
          draggable={false}
        />
      </motion.div>
    </motion.div>
  );
});
