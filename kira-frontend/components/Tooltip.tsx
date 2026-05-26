'use client';

import { ReactNode, useState } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const POS_CLASSES = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2 origin-bottom',
  bottom: 'top-full   left-1/2 -translate-x-1/2 mt-2 origin-top',
  left:   'right-full top-1/2  -translate-y-1/2  mr-2 origin-right',
  right:  'left-full  top-1/2  -translate-y-1/2  ml-2 origin-left',
};

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}

      {/* Always rendered, animated via CSS transition */}
      <div
        role="tooltip"
        className={[
          'absolute z-50 px-2.5 py-1.5 text-xs text-white',
          'bg-gray-900/90 rounded-lg whitespace-nowrap',
          'pointer-events-none shadow-xl',
          'transition-all duration-200 ease-out',
          POS_CLASSES[position],
          visible
            ? 'opacity-100 scale-100 blur-0'
            : 'opacity-0 scale-90 blur-[1px]',
        ].join(' ')}
      >
        {content}
        {/* Small arrow */}
        <span
          className={[
            'absolute w-2 h-2 bg-gray-900/90 rotate-45',
            position === 'top'    && 'bottom-[-4px] left-1/2 -translate-x-1/2',
            position === 'bottom' && 'top-[-4px]    left-1/2 -translate-x-1/2',
            position === 'left'   && 'right-[-4px]  top-1/2  -translate-y-1/2',
            position === 'right'  && 'left-[-4px]   top-1/2  -translate-y-1/2',
          ].filter(Boolean).join(' ')}
        />
      </div>
    </div>
  );
}
