// Lightweight, framework-free way to fire a notification bar from anywhere
// in the app (any client component, any page) without prop-drilling or a
// context provider. <Toast /> (mounted once in layout.jsx) listens for the
// 'app:toast' window event and renders whatever gets dispatched here.
//
// Usage:
//   import { notify } from '../components/toast';
//   notify('Rental request denied and removed.', 'success');
//   notify('Something went wrong. Please try again.', 'error');

export function notify(message, type = 'success', duration = 3500) {
  if (typeof window === 'undefined' || !message) return;
  window.dispatchEvent(
    new CustomEvent('app:toast', { detail: { message, type, duration } })
  );
}
