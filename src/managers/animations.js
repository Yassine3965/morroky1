export const setupAnimations = () => {
    const style = document.createElement('style');
    style.textContent = `
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slide-up {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes scale-in {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
    .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
    .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
  `;
    document.head.appendChild(style);
};
