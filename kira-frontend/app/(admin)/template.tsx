export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-transition flex-1 min-h-screen">
      {children}
    </div>
  );
}