import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/providers/ProtectedRoute";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}
