export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold text-primary mb-4 tracking-tighter">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a href="/" className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium shadow-md hover:bg-primary/90 transition-colors">
        Return Home
      </a>
    </div>
  );
}