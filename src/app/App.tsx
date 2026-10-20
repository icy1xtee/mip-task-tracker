import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { BudgetPage } from '@/features/budget/BudgetPage';
import { IdeasPage } from '@/features/ideas/IdeasPage';
import { LinksPage } from '@/features/links/LinksPage';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { TasksPage } from '@/features/tasks/TasksPage';
import { firebaseConfig } from '@/lib/firebase/client';
import { ConfigErrorScreen } from './ConfigErrorScreen';

export function App() {
  if (!firebaseConfig.ok) return <ConfigErrorScreen missing={firebaseConfig.missing} />;

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="ideas" element={<IdeasPage />} />
              <Route path="budget" element={<BudgetPage />} />
              <Route path="links" element={<LinksPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
