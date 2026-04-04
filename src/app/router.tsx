import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "@/app/AppShell";
import { useAuth } from "@/app/AuthProvider";
import { LoadingState } from "@/components/LoadingState";
import { AuthPage } from "@/features/auth/AuthPage";
import { SetupPage } from "@/features/auth/SetupPage";
import { GameDashboardPage } from "@/features/dashboard/GameDashboardPage";
import { PostGameSummaryPage } from "@/features/dashboard/PostGameSummaryPage";
import { StatsReportPage } from "@/features/dashboard/StatsReportPage";
import { GameSetupPage } from "@/features/games/GameSetupPage";
import { RosterPage } from "@/features/roster/RosterPage";
import { OverviewPage } from "@/features/teams/OverviewPage";

const RootRedirect = () => {
  const { isConfigured, isLoading, session } = useAuth();

  if (isLoading) {
    return <LoadingState label="Checking session" />;
  }

  if (!isConfigured) {
    return <Navigate to="/setup" replace />;
  }

  return <Navigate to={session ? "/app" : "/auth"} replace />;
};

const ProtectedApp = () => {
  const { isConfigured, isLoading, session } = useAuth();

  if (isLoading) {
    return <LoadingState label="Preparing app shell" />;
  }

  if (!isConfigured) {
    return <Navigate to="/setup" replace />;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <AppShell />;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />
  },
  {
    path: "/auth",
    element: <AuthPage />
  },
  {
    path: "/setup",
    element: <SetupPage />
  },
  {
    path: "/app",
    element: <ProtectedApp />,
    children: [
      {
        index: true,
        element: <OverviewPage />
      },
      {
        path: "roster",
        element: <RosterPage />
      },
      {
        path: "games/new",
        element: <GameSetupPage />
      },
      {
        path: "games/:gameId",
        element: <GameDashboardPage />
      },
      {
        path: "report/:gameId",
        element: <StatsReportPage />
      },
      {
        path: "summary/:gameId",
        element: <PostGameSummaryPage />
      }
    ]
  }
]);
