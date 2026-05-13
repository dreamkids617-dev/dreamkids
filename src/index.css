@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 238 84% 67%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 238 84% 67%;
    --radius: 0.75rem;
  }
}

@layer base {
  * {
    @apply border-border;
    -webkit-tap-highlight-color: transparent;
  }
  html {
    scroll-behavior: smooth;
    height: 100%;
    overflow: hidden;
  }
  body {
    @apply bg-background text-foreground;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overscroll-behavior: none;
    user-select: none;
    -webkit-user-select: none;
    height: 100%;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    letter-spacing: -0.01em;
  }
  #root {
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}

@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .safe-bottom {
    padding-bottom: max(env(safe-area-inset-bottom, 0px), 8px);
  }
  .safe-top {
    padding-top: env(safe-area-inset-top, 0px);
  }
  .app-container {
    max-width: 430px;
    margin: 0 auto;
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: #f8fafc;
  }
  .page-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }
}

/* Animations */
@keyframes slideUp {
  from {
    transform: translateY(12px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes bounceIn {
  0% { transform: scale(0.8); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-slide-up {
  animation: slideUp 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.animate-fade-in {
  animation: fadeIn 0.25s ease-out;
}

.animate-scale-in {
  animation: scaleIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.animate-bounce-in {
  animation: bounceIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* Touch feedback */
.touch-active {
  transition: transform 0.1s ease, opacity 0.1s ease;
}
.touch-active:active {
  transform: scale(0.97);
  opacity: 0.9;
}

/* Premium card shadow */
.card-shadow {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
}
.card-shadow-md {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.02);
}
.card-shadow-lg {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.03);
}