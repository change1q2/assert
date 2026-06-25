import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sidebar, Header, MobileNav } from "@/components/layout";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import CoursesPage from "@/pages/CoursesPage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import LearningPage from "@/pages/LearningPage";
import ProgressPage from "@/pages/ProgressPage";
import CommunityPage from "@/pages/CommunityPage";
import ProfilePage from "@/pages/ProfilePage";
import AchievementsPage from "@/pages/AchievementsPage";
import { useAuthStore } from "@/store/authStore";

const publicRoutes = ["/login", "/register"];

function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-800 dark:to-dark-900">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <Header
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          title=""
        />
        <main className="p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Router>
      <AppLayout>
        <AnimatePresence mode="wait">
          <Routes>
            <Route
              path="/"
              element={isAuthenticated ? <HomePage /> : <LoginPage />}
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/courses"
              element={isAuthenticated ? <CoursesPage /> : <LoginPage />}
            />
            <Route
              path="/courses/:courseId"
              element={isAuthenticated ? <CourseDetailPage /> : <LoginPage />}
            />
            <Route
              path="/learn/:moduleType"
              element={isAuthenticated ? <LearningPage /> : <LoginPage />}
            />
            <Route
              path="/progress"
              element={isAuthenticated ? <ProgressPage /> : <LoginPage />}
            />
            <Route
              path="/community"
              element={isAuthenticated ? <CommunityPage /> : <LoginPage />}
            />
            <Route
              path="/profile"
              element={isAuthenticated ? <ProfilePage /> : <LoginPage />}
            />
            <Route
              path="/achievements"
              element={
                isAuthenticated ? <AchievementsPage /> : <LoginPage />
              }
            />
          </Routes>
        </AnimatePresence>
      </AppLayout>
    </Router>
  );
}
