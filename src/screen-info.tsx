import { createRoot, type Root } from 'react-dom/client';
import { motion, useReducedMotion } from 'motion/react';

type InfoItem = [title: string, description: string];

declare global {
  interface Window {
    renderReactScreenInfo?: (items: InfoItem[]) => void;
  }
}

let root: Root | undefined;

function ScreenInfo({ items }: { items: InfoItem[] }) {
  const reducedMotion = useReducedMotion();
  return <>{items.map(([title, description], index) =>
    <motion.section className="infoSheetItem tw:min-w-0" key={title}
      initial={reducedMotion ? false : { opacity: 0.7, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.2, delay: reducedMotion ? 0 : index * 0.035 }}>
      <h3>{title}</h3><p>{description}</p>
    </motion.section>
  )}</>;
}

export function renderScreenInfo(items: InfoItem[]) {
  const host = document.getElementById('screenInfoContent');
  if (!host) return;
  if (!root) root = createRoot(host);
  window.renderReactScreenInfo = renderScreenInfo;
  root.render(<ScreenInfo items={items} />);
}
