import { createRoot } from 'react-dom/client';
import { motion, useReducedMotion } from 'motion/react';
import './tailwind.css';

function LaunchMotto() {
  const reducedMotion = useReducedMotion();
  return (
    <motion.p
      className="launchMotto tw:text-center"
      initial={reducedMotion ? false : { opacity: 0.8 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.24 }}
    >
      Fair by design. Flexible under pressure. Safe in practice.
    </motion.p>
  );
}

// The legacy application owns the operational DOM. React owns this static
// launch region alone while authenticated screens migrate in later PRs.
const mount = document.getElementById('reactLaunchMotto');
if (mount) createRoot(mount).render(<LaunchMotto />);
