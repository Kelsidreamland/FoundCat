import { motion, useDragControls, PanInfo } from 'framer-motion';
import { useScrapbookStore, ScrapbookItem } from '../store/useScrapbookStore';
import { memo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';

import { formatDate } from '../translations';

interface ScrapbookElementProps {
  item: ScrapbookItem;
  constraintsRef?: React.RefObject<HTMLDivElement>;
  isPhysicsMode?: boolean;
  onSelect?: (item: ScrapbookItem) => void;
}

export const ScrapbookElement = memo(function ScrapbookElement({ item, constraintsRef, isPhysicsMode = false, onSelect }: ScrapbookElementProps) {
  const { updateItem, bringToFront, removeItem } = useScrapbookStore();
  const [isDragging, setIsDragging] = useState(false);
  const dragControls = useDragControls();

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    if (!isPhysicsMode) {
      updateItem(item.id, {
        x: item.x + info.offset.x,
        y: item.y + info.offset.y,
      });
    }
  };

  const handlePointerDown = () => {
    if (!isPhysicsMode) bringToFront(item.id);
  };

  const renderContent = () => {
    if (item.type === 'sticker') {
      return (
        <div className="relative group touch-none select-none">
          <img 
            src={item.imageData} 
            alt="Sticker" 
            className="w-40 h-40 object-contain pointer-events-none"
            style={{
              filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15)) drop-shadow(0px 1px 2px rgba(0,0,0,0.1))',
              WebkitFilter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15)) drop-shadow(0px 1px 2px rgba(0,0,0,0.1))'
            }}
          />
        </div>
      );
    }

    if (item.type === 'stamp') {
      return (
        <div className="relative group touch-none select-none">
          <div 
            className="w-40 h-40 bg-white p-3 flex flex-col pointer-events-none"
            style={{
              maskImage: 'radial-gradient(circle at 4px 4px, transparent 4px, black 4.5px)',
              maskSize: '12px 12px',
              maskPosition: '-4px -4px',
              WebkitMaskImage: 'radial-gradient(circle at 4px 4px, transparent 4px, black 4.5px)',
              WebkitMaskSize: '12px 12px',
              WebkitMaskPosition: '-4px -4px',
              filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15)) drop-shadow(0px 1px 2px rgba(0,0,0,0.1))',
              WebkitFilter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15)) drop-shadow(0px 1px 2px rgba(0,0,0,0.1))'
            }}
          >
            <div className="flex-1 overflow-hidden relative mb-2">
              <img 
                src={item.imageData} 
                alt="Stamp" 
                className="absolute inset-0 w-full h-full object-cover filter contrast-125 saturate-75"
              />
            </div>
            <div className="text-center text-[10px] text-cat-text-tertiary font-bold tracking-widest uppercase opacity-70">
              {formatDate(new Date(item.date), 'en', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <motion.div
      drag={!isPhysicsMode}
      dragControls={!isPhysicsMode ? dragControls : undefined}
      dragConstraints={!isPhysicsMode ? constraintsRef : undefined}
      dragElastic={0.1}
      dragMomentum={false}
      onDragStart={() => !isPhysicsMode && setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onPointerDown={handlePointerDown}
      initial={!isPhysicsMode ? { x: item.x, y: item.y, rotate: item.rotation, scale: item.scale } : false}
      animate={!isPhysicsMode ? { x: item.x, y: item.y, rotate: item.rotation, scale: item.scale } : false}
      style={{ zIndex: item.zIndex, position: isPhysicsMode ? 'relative' : 'absolute' }}
      whileHover={{ scale: isPhysicsMode ? 1 : 1.05 }}
      whileDrag={{ scale: isPhysicsMode ? 1 : 1.1, cursor: 'grabbing' }}
      className={cn(isPhysicsMode ? "cursor-pointer" : "cursor-grab", isDragging ? "cursor-grabbing" : "")}
      onClick={() => {
        if (isPhysicsMode) {
          onSelect?.(item);
        }
      }}
    >
      <div className="relative group">
        {renderContent()}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if(window.confirm('確定要刪除這個圖鑑嗎？')) {
              removeItem(item.id);
            }
          }}
          className="absolute -top-3 -right-3 bg-red-400 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-50 touch-auto focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
          aria-label="Delete item"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
});
