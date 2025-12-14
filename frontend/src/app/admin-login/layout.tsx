/**
 * Admin Login Layout - Clean layout without sidebar/topnav
 */

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
